import _ from 'lodash';
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
        updateFiltersOnChange={this.vis.params.updateFiltersOnChange}
        controls={this.controls}
        stageFilter={this.stageFilter.bind(this)}
        submitFilters={this.submitFilters.bind(this)}
        resetControls={this.updateControlsFromKbn.bind(this)}
        clearControls={this.clearControls.bind(this)}
        getStagedControls={this.getStagedControls.bind(this)}
      />,
      this.el);
  }

  initControls() {
    this.controls = [];

    controlFactory(
      this.vis.params.controls,
      this.vis.API,
      (index, control) => {
        this.controls[index] = control;
        this.drawVis();
      }
    );
  }

  stageFilter(controlIndex, newValue, kbnFilter) {
    this.controls[controlIndex].value = newValue;
    this.controls[controlIndex].stagedFilter = kbnFilter;
    if (this.vis.params.updateFiltersOnChange) {
      // submit filters on each control change
      this.submitFilters();
    } else {
      // Do not submit filters, just update vis so controls are updated with latest value
      this.drawVis();
    }
  }

  getStagedControls() {
    return this.controls.filter((control) => {
      if (_.has(control, 'stagedFilter')) {
        return true;
      }
      return false;
    });
  }

  submitFilters() {
    const stagedControls = this.getStagedControls();
    const newFilters = stagedControls.map((control) => {
      return control.stagedFilter;
    });

    stagedControls.forEach((control) => {
      // to avoid duplicate filters, remove any old filters for control
      control.filterManager.findFilters().forEach((existingFilter) => {
        this.vis.API.queryFilter.removeFilter(existingFilter);
      });
      delete control.stagedFilter;
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
      delete control.stagedFilter;
      control.value = control.filterManager.getValueFromFilterBar();
    });
    this.drawVis();
  }
}

export { VisController };
