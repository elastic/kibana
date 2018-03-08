import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { InputControlVis } from './components/vis/input_control_vis';
import { controlFactory } from './control/control_factory';
import { getLineageMap } from './lineage';

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
    const controlParamsList = this.vis.params.controls.filter((controlParams) => {
      // ignore controls that do not have indexPattern or field
      return controlParams.indexPattern && controlParams.fieldName;
    });

    const controlFactoryPromises = controlParamsList.map((controlParams) => {
      const factory = controlFactory(controlParams);
      return factory(controlParams, this.vis.API, this.vis.params.useTimeFilter);
    });
    const controls = await Promise.all(controlFactoryPromises);

    const getControl = (id) => {
      return controls.find(control => {
        return id === control.id;
      });
    };

    const controlInitPromises = [];
    getLineageMap(controlParamsList).forEach((lineage, controlId) => {
      // first lineage item is the control. remove it
      lineage.shift();
      const ancestors = [];
      lineage.forEach(ancestorId => {
        ancestors.push(getControl(ancestorId));
      });
      const control = getControl(controlId);
      control.setAncestors(ancestors);
      controlInitPromises.push(control.fetch());
    });

    await Promise.all(controlInitPromises);
    return controls;
  }

  async stageFilter(controlIndex, newValue) {
    this.controls[controlIndex].set(newValue);
    if (this.vis.params.updateFiltersOnChange) {
      // submit filters on each control change
      this.submitFilters();
    } else {
      // Do not submit filters, just update vis so controls are updated with latest value
      await this.updateNestedControls();
      this.drawVis();
    }
  }

  submitFilters() {
    // Clean up filter pills for nested controls that are now disabled because ancestors are not set
    this.controls.map(async (control) => {
      if (control.hasAncestors() && control.hasUnsetAncestor()) {
        control.filterManager.findFilters().forEach((existingFilter) => {
          this.vis.API.queryFilter.removeFilter(existingFilter);
        });
      }
    });

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

  async updateControlsFromKbn() {
    this.controls.forEach((control) => {
      control.reset();
    });
    await this.updateNestedControls();
    this.drawVis();
  }

  async updateNestedControls() {
    const fetchPromises = this.controls.map(async (control) => {
      if (control.hasAncestors()) {
        await control.fetch();
      }
    });
    return await Promise.all(fetchPromises);
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
