import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { InputControlVis } from './components/vis/input_control_vis';
import { controlFactory } from './control/control_factory';

class VisController {
  constructor(el, vis) {
    this.el = el;
    this.vis = vis;
    this.controls = [];

    this.queryBarUpdateHandler = this.updateControlsFromKbn.bind(this);
    this.vis.API.queryFilter.on('update', this.queryBarUpdateHandler);
  }

  async render(visData, status) {
    if (status.params || (this.vis.params.useTimeFilter && status.time)) {
      this.controls = [];
      this.controls = await this.initControls();
      this.drawVis();
      return;
    }
    return;
  }

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
        hasChanges={this.hasChanges.bind(this)}
        hasValues={this.hasValues.bind(this)}
      />,
      this.el);
  }

  async initControls() {
    return await Promise.all(
      this.vis.params.controls.filter((controlParams) => {
        // ignore controls that do not have indexPattern or field
        return controlParams.indexPattern && controlParams.fieldName;
      })
        .map((controlParams) => {
          const factory = controlFactory(controlParams);
          return factory(controlParams, this.vis.API, this.vis.params.useTimeFilter);
        })
    );
  }

  stageFilter(controlIndex, newValue) {
    this.controls[controlIndex].set(newValue);
    if (this.vis.params.updateFiltersOnChange) {
      // submit filters on each control change
      this.submitFilters();
    } else {
      // Do not submit filters, just update vis so controls are updated with latest value
      this.drawVis();
    }
  }

  submitFilters() {
    const stagedControls = this.controls.filter((control) => {
      return control.hasChanged();
    });

    const newFilters = stagedControls
      .filter((control) => {
        return control.hasKbnFilter();
      })
      .map((control) => {
        return control.getKbnFilter();
      });

    stagedControls.forEach((control) => {
      // to avoid duplicate filters, remove any old filters for control
      control.filterManager.findFilters().forEach((existingFilter) => {
        this.vis.API.queryFilter.removeFilter(existingFilter);
      });
    });

    this.vis.API.queryFilter.addFilters(newFilters, this.vis.params.pinFilters);
  }

  clearControls() {
    this.controls.forEach((control) => {
      control.clear();
    });
    this.drawVis();
  }

  updateControlsFromKbn() {
    this.controls.forEach((control) => {
      control.reset();
    });
    this.drawVis();
  }

  hasChanges() {
    return this.controls.map((control) => {
      return control.hasChanged();
    })
      .reduce((a, b) => {
        return a || b;
      });
  }

  hasValues() {
    return this.controls.map((control) => {
      return control.hasValue();
    })
      .reduce((a, b) => {
        return a || b;
      });
  }
}

export { VisController };
