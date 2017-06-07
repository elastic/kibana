import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { VisController } from './vis_controller';
import { TermsVisEditor } from './components/terms_vis_editor';

class EditorController {
  constructor(el, vis) {
    this.el = el;
    this.vis = vis;
    this.editorDiv = document.createElement('div');
    this.visDiv = document.createElement('div');
    this.el.appendChild(this.editorDiv);
    this.el.appendChild(this.visDiv);
    this.visualization = new VisController(this.visDiv);
  }

  render(visData) {
    let count = 0;
    const setVisParam = (paramName, paramValue) => {
      this.vis.params[paramName] = paramValue;
      //this.vis.updateState();
      count++;
      console.log('count', count);
    };
    const getIndexPatternIds = () => {
      return this.vis.API.indexPatterns.getIds();
    };
    const getIndexPattern = (indexPatternId) => {
      return this.vis.API.indexPatterns.get(indexPatternId);
    };
    return new Promise(resolve => {
      render(
        <TermsVisEditor
          visParams={this.vis.params}
          count={count}
          setVisParam={setVisParam}
          getIndexPatternIds={getIndexPatternIds}
          getIndexPattern={getIndexPattern}
        />,
        this.el
      );
      // we probably want to render the visualization as well ?
      this.visualization.render(this.vis, visData).then(() => {
        resolve('when done rendering');
      });
    });
  }

  resize() {
    return this.visualization.resize();
  }

  destroy() {
    unmountComponentAtNode(this.el);
    this.visualization.destroy();
  }
}

export { EditorController };
