import "./style/style.css";
import { workerActions } from "./config.js";
import { count, expr, container, canvas, svgWorker } from "./global.js";
import { func } from "./GraphUtils.js";
import Sketch from "./Sketch.js";
import setMathToWindow from "./mathAndWindow.js";

// import Hammerjs from 'hammerjs';
let firstUpdateHappened = false;
window.sketch = new Sketch('#canvas');

function addFunction(expr) {
  let f = new func({ expr });
  sketch.addChildren(f);

  svgWorker.postMessage({
    action: workerActions.ADD_GRAPH_ELEMENT,
    graphElement: f.objectify(),
  });
}

function editFunction(id, expr) {
  sketch.getChildren(id).expr = expr;

  svgWorker.postMessage({
    action: workerActions.EDIT_GRAPH_ELEMENT,
    graphElement: { id, props: { expr } },
  });
}

function drawTheSketch() {
	if (firstUpdateHappened) requestAnimationFrame(() => sketch.draw());
}

function init() {
  setMathToWindow();

  let pxRatio = devicePixelRatio;
  let newW = container.clientWidth * pxRatio,
    newH = container.clientHeight * pxRatio;

  canvas.width = newW;
	canvas.height = newH;
	sketch.coorm
		.pipe()
		.translate((newW - sketch.coorm.w) / 2, (newH - sketch.coorm.h) / 2)
		.setSize(newW, newH)
    .end()
  ;

  let span = document.querySelector("#count + span");
  span.innerText = count.value;

  for (let i = 1; i < 21; i++) {
    addFunction(i + "*" + expr.value);
	}
	
	sketch.update(true);
}

//#region translation, change origin position

let ismousedown = false;
let mouse;

container.onmousedown = (e) => {
  document.body.style.userSelect = "none";
  ismousedown = true;
  mouse = { x: e.x, y: e.y };
};

window.onmouseup = () => {
  document.body.style.userSelect = "select";
  ismousedown = false;
};

window.onmousemove = (e) => {
  if (ismousedown) {
    let v = { x: e.x - mouse.x, y: e.y - mouse.y };
    // let a = drawings.getAttribute('viewBox').split(' ');
    sketch.coorm.translate(v.x, v.y);
    mouse = { x: e.x, y: e.y };
    drawTheSketch();
    sketch.update();
  }
};

container.onwheel = (e) => {
  let scalar = -Math.sign(e.deltaY) * 0.1 + 1;
  sketch.coorm.scale(scalar, scalar);
  drawTheSketch();
  sketch.update();
};

window.onresize = () => {
  let pxRatio = devicePixelRatio;
  let newW = container.clientWidth * pxRatio,
    newH = container.clientHeight * pxRatio;

  sketch.coorm
    .pipe()
    .translate((newW - sketch.coorm.w) / 2, (newH - sketch.coorm.h) / 2)
    .setSize(newW, newH)
    .end();

  drawTheSketch();
  sketch.update();
};

(function touchEvents() {})();

//#endregion

//#region changing expresion or resolution

count.onchange = () => {
  let span = document.querySelector("#count + span");
  span.innerText = count.value;
  drawTheSketch();
  sketch.update(true);
};

expr.onchange = () => {
  for (let i = 0; i < sketch.children.length; i++) {
    editFunction(sketch.children[i].id, i + 1 + "*" + expr.value);
  }
  drawTheSketch();
  sketch.update(true);
};

//#endregion

svgWorker.addEventListener("message", (msg) => {
  let action = msg.data.action;
  if (msg.data.error) {
    let errElm = document.querySelector(".error");
    if (errElm.innerText === "") var r = true;
    errElm.innerHTML = msg.data.errMessage;

    if (action === workerActions.UPDATE) {
      if (sketch.updateStatus.isReAllowed()) {
        sketch.updateStatus.updated();
        sketch.update(...updateStatus.reupdateArgs);
      } else {
        sketch.updateStatus.status = "ready";
      }
    }
    if (r) onresize();
  } else {
    if (action === workerActions.UPDATE) {
			firstUpdateHappened = true;

      sketch.children.settings = msg.data.settings;
      for (let i = 0; i < sketch.children.length; i++) {
        sketch.children[i].update(msg.data.data[i]);
      }
      drawTheSketch();

      if (sketch.updateStatus.isReAllowed()) {
        sketch.updateStatus.updated();
        sketch.update(...sketch.updateStatus.reupdateArgs);
      } else {
        sketch.updateStatus.updated();
      }
    }
  }
});

init();

