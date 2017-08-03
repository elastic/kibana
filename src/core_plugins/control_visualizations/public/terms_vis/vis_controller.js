import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { InputControlVis } from './components/input_control_vis';
import { initTermsControl } from './lib/init_terms_control';
import { initTextControl } from './lib/init_text_control';

class VisController {
  constructor(el, vis) {
    this.el = el;
    this.vis = vis;
    this.controls = [];

    this.queryBarUpdateHandler = this.updateControls.bind(this);
    this.vis.API.queryFilter.on('update', this.queryBarUpdateHandler);
  }

  render(visData, status) {
    if (status.params) {
      this.initControls();
    }
    return new Promise(() => {});
  }

  resize() {}

  destroy() {
    this.vis.API.queryFilter.off('update', this.queryBarUpdateHandler);
    unmountComponentAtNode(this.el);
  }

  drawVis() {
    render(
      <InputControlVis controls={this.controls} setFilter={this.setFilter.bind(this)} removeFilter={this.removeFilter.bind(this)} />,
      this.el);
  }

  initControls() {
    this.controls = [];

    const createRequestPromises = this.vis.params.controls
    .filter((control) => {
      // ignore controls that do not have indexPattern or field
      return control.indexPattern && control.fieldName;
    })
    .map(async (controlParams) => {
      let initFunc = null;
      switch (controlParams.type) {
        case 'terms':
          initFunc = initTermsControl;
          break;
        case 'range':
          break;
        case 'text':
          initFunc = initTextControl;
          break;
      }

      if (initFunc) {
        return initFunc(
          controlParams,
          this.vis.API.indexPatterns,
          this.vis.API.SearchSource,
          this.vis.API.queryFilter,
          (control) => {
            this.controls.push(control);
            this.drawVis();
          });
      }
    });
    Promise.all(createRequestPromises).then(requests => {
      this.vis.API.fetch.these(requests);
    });
  }

  setFilter(filterManager, value) {
    // to avoid duplicate filters, remove any old filters for this index pattern field
    filterManager.findFilters().forEach((existingFilter) => {
      this.vis.API.queryFilter.removeFilter(existingFilter);
    });

    // add new filter
    this.vis.API.queryFilter.addFilters(filterManager.createFilter(value));
  }

  removeFilter(filterManager) {
    filterManager.findFilters().forEach((filter) => {
      this.vis.API.queryFilter.removeFilter(filter);
    });
  }

  updateControls() {
    this.controls = this.controls.map((control) => {
      control.value = control.filterManager.getValueFromFilterBar();
      return control;
    });
    this.drawVis();
  }
}

export { VisController };
