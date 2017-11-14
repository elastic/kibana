import _ from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { InputControlVis } from './components/vis/vis';
import { controlFactory } from './control/control_factory';

const PANEL_BORDER = 1; // width added by border from class '.panel'
const EMBEDDED_PANEL_PADDING = 8; // width added by padding from class '.panel-content'
const INPUT_CONTROL_VIS_MARGIN = 5; // width added by margin from class '.inputControlVis'
const FLEX_GRID_SMALL_MARGIN = 4; // width added by margin from class '..kuiFlexGrid--gutterSmall'

class VisController {
  constructor(el, vis) {
    this.el = el;
    this.vis = vis;
    this.controls = [];

    this.queryBarUpdateHandler = this.updateControlsFromKbn.bind(this);
    this.vis.API.queryFilter.on('update', this.queryBarUpdateHandler);
  }

  async render(visData, status) {
    if (status.params) {
      this.controls = [];
      this.controls = await this.initControls();
      this.drawVis();
      return;
    }
    if (status.resize) {
      this.drawVis();
      return;
    }
    return;
  }

  destroy() {
    this.vis.API.queryFilter.off('update', this.queryBarUpdateHandler);
    unmountComponentAtNode(this.el);
  }

  isHorizontalLayout(panelWidth, panelHeight) {
    return panelWidth > (1.5 * panelHeight) || panelWidth < 200;
  }

  drawVis() {
    // unable to use this.el dimensions because this.el.clientWidth does not shrink
    // once controlWidth has been set to a large number
    const panelNode = this.getPanelNode();
    if (!panelNode) {
      throw new Error('Unable to find panel node in ancestor tree');
    }
    const panelWidth = panelNode.clientWidth;
    const panelHeight = panelNode.clientHeight;
    // todo - how do we make this less fragile to css changes?
    const lostWidth = (PANEL_BORDER + EMBEDDED_PANEL_PADDING + INPUT_CONTROL_VIS_MARGIN) * 2;
    const usableWidth = panelWidth - lostWidth;
    let controlWidth;
    if (this.controls.length > 1 && this.isHorizontalLayout(panelWidth, panelHeight)) {
      // horizontal layout - display each control in seperate column by sizing controls to fit in single row
      const widthLostByFlexItemMargin = 2 * FLEX_GRID_SMALL_MARGIN * this.controls.length;
      controlWidth = Math.floor((usableWidth - widthLostByFlexItemMargin) / this.controls.length);
    } else {
      // vertical layout - display each control in seperate row by sizing control to fill entrie width
      controlWidth = usableWidth - (2 * FLEX_GRID_SMALL_MARGIN);
    }
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
        controlWidth={controlWidth}
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
          return factory(controlParams, this.vis.API);
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

    this.vis.API.queryFilter.addFilters(newFilters);
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

  getPanelNode() {
    let parent = this.el.parentNode;
    let panelNode;
    while (parent) {
      if (_.includes(parent.className, 'dashboard-panel') || _.includes(parent.className, 'vis-editor-canvas')) {
        panelNode = parent;
        break;
      }
      parent = parent.parentNode;
    }
    return panelNode;
  }
}

export { VisController };
