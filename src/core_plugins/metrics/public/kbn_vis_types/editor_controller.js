import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { FetchFieldsProvider } from '../lib/fetch_fields';
import { extractIndexPatterns } from '../lib/extract_index_patterns';
const AUTO_APPLY_KEY = 'metrics_autoApply';

function ReactEditorControllerProvider(Private, localStorage, config) {
  const fetchFields = Private(FetchFieldsProvider);

  class ReactEditorController {
    constructor(el, vis) {
      this.el = el;
      this.vis = vis;
      this.vis.fields = {};

      const autoApply = localStorage.get(AUTO_APPLY_KEY);
      vis.autoApply = autoApply != null ? autoApply : true;
      vis.initialized = true;
    }

    render(visData) {
      this.visData = visData;
      const indexPatterns = extractIndexPatterns(this.vis);
      return new Promise((resolve) => {
        fetchFields(indexPatterns).then(fields => {
          this.vis.fields = { ...fields, ...this.vis.fields };
          const Component = this.vis.type.editorConfig.component;
          render(<Component config={config} vis={this.vis} visData={visData} renderComplete={resolve}/>, this.el);
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
