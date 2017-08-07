import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { InputControlVis } from './components/input_control_vis';
import { controlFactory } from './controls/control_factory';

class VisController {
  constructor(el, vis) {
    this.el = el;
    this.vis = vis;
    this.controls = [];

    this.queryBarUpdateHandler = this.updateControlsFromKbn.bind(this);
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
      <InputControlVis
        controls={this.controls}
        stageFilter={this.stageFilter.bind(this)}
        submitFilters={this.submitFilters.bind(this)}
        resetControls={this.updateControlsFromKbn.bind(this)}
        clearControls={this.clearControls.bind(this)}
      />,
      this.el);
  }

  initControls() {
    this.controls = [];

    controlFactory(
      this.vis.params.controls,
      this.vis.API,
      (control) => {
        this.controls.push(control);
        this.drawVis();
      }
    );
  }

  stageFilter(controlIndex, newValue, kbnFilter) {
    this.controls[controlIndex].value = newValue;
    this.controls[controlIndex].stagedFilter = kbnFilter;
    this.drawVis();
  }

  submitFilters() {
    const stagedControls = this.controls.filter((control) => {
      if (control.stagedFilter) {
        return true;
      }
      return false;
    });
    const newFilters = stagedControls.map((control) => {
      return control.stagedFilter;
    });

    stagedControls.forEach((control) => {
      // to avoid duplicate filters, remove any old filters for control
      control.filterManager.findFilters().forEach((existingFilter) => {
        this.vis.API.queryFilter.removeFilter(existingFilter);
      });
      control.stagedFilter = undefined;
    });

    this.vis.API.queryFilter.addFilters(newFilters);
  }

  clearControls() {
    this.controls.forEach((control) => {
      control.filterManager.findFilters().forEach((existingFilter) => {
        this.vis.API.queryFilter.removeFilter(existingFilter);
      });
    });
  }

  updateControlsFromKbn() {
    this.controls.forEach((control) => {
      control.stagedFilter = undefined;
      control.value = control.filterManager.getValueFromFilterBar();
    });
    this.drawVis();
  }
}

export { VisController };
