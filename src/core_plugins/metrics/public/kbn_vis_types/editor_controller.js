import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { FetchFieldsProvider } from '../lib/fetch_fields';
const AUTO_APPLY_KEY = 'metrics_autoApply';

function ReactEditorControllerProvider(Private, localStorage) {
  const fetchFields = Private(FetchFieldsProvider);

  class ReactEditorController {
    constructor(el, vis) {
      this.el = el;
      this.vis = vis;

      const autoApply = localStorage.get(AUTO_APPLY_KEY);
      vis.autoApply = autoApply != null ? autoApply : true;
    }

    render(visData) {
      this.visData = visData;

      return new Promise((resolve) => {
        fetchFields(this.vis.params.index_pattern).then(fields => {
          this.vis.fields = fields;
          const Component = this.vis.type.editorConfig.component;
          render(<Component vis={this.vis} visData={visData} renderComplete={resolve}/>, this.el);
        });
      });
    }

    resize() {
      if (this.visData) {
        this.render(this.visData);
      }
    }

    destroy() {
      unmountComponentAtNode(this.el);
    }
  }

  return {
    name: 'react_editor',
    handler: ReactEditorController
  };
}

export { ReactEditorControllerProvider };
