import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

class ReactEditorController {
  constructor(el, vis) {
    this.el = el;
    this.vis = vis;
  }

  render(visData) {
    this.visData = visData;

    return new Promise((resolve) => {
      const Component = this.vis.type.visConfig.component;
      render(<Component vis={this.vis} visData={visData} renderComplete={resolve} />, this.el);
    });
  }

  resize() {
    if (this.visData) {
      this.render(this.vis, this.visData);
    }
  }

  destroy() {
    unmountComponentAtNode(this.el);
  }
}

export { ReactEditorController };
