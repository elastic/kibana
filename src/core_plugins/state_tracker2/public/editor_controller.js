import { VisController } from './vis_controller';

class EditorController {
  constructor(el) {
    this.el = el;
    this.editorDiv = document.createElement('div');
    this.visDiv = document.createElement('div');
    this.el.appendChild(this.editorDiv);
    this.el.appendChild(this.visDiv);
    this.visualization = new VisController(this.visDiv);
  }

  render(vis, visData) {
    return new Promise(resolve => {
      console.log('rendering editor');
      this.editorDiv.innerHTML = 'my editor';
      // we probably want to render the visualization as well ?
      this.visualization.render(vis, visData).then(() => {
        resolve('when done rendering');
      });
    });
  }

  resize() {
    return this.visualization.resize();
  }

  destroy() {
    this.visualization.destroy();
  }
};

export { EditorController };
