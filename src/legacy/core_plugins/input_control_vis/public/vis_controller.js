/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nContext } from 'ui/i18n';
import { InputControlVis } from './components/vis/input_control_vis';
import { controlFactory } from './control/control_factory';
import { getLineageMap } from './lineage';

class VisController {
  constructor(el, vis) {
    this.el = el;
    this.vis = vis;
    this.controls = [];

    this.queryBarUpdateHandler = this.updateControlsFromKbn.bind(this);

    this.updateSubsciption = this.vis.API.queryFilter.getUpdates$()
      .subscribe(this.queryBarUpdateHandler);
  }

  async render(visData, visParams, status) {
    if (status.params || (visParams.useTimeFilter && status.time)) {
      this.visParams = visParams;
      this.controls = [];
      this.controls = await this.initControls();
      this.drawVis();
      return;
    }
    return;
  }

  destroy() {
    this.updateSubsciption.unsubscribe();
    unmountComponentAtNode(this.el);
  }

  drawVis = () => {
    render(
      <I18nContext>
        <InputControlVis
          updateFiltersOnChange={this.visParams.updateFiltersOnChange}
          controls={this.controls}
          stageFilter={this.stageFilter}
          submitFilters={this.submitFilters}
          resetControls={this.updateControlsFromKbn}
          clearControls={this.clearControls}
          hasChanges={this.hasChanges}
          hasValues={this.hasValues}
          refreshControl={this.refreshControl}
        />
      </I18nContext>,
      this.el);
  }

  async initControls() {
    const controlParamsList = this.visParams.controls.filter((controlParams) => {
      // ignore controls that do not have indexPattern or field
      return controlParams.indexPattern && controlParams.fieldName;
    });

    const controlFactoryPromises = controlParamsList.map((controlParams) => {
      const factory = controlFactory(controlParams);
      return factory(controlParams, this.vis.API, this.visParams.useTimeFilter);
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

  stageFilter = async (controlIndex, newValue) => {
    this.controls[controlIndex].set(newValue);
    if (this.visParams.updateFiltersOnChange) {
      // submit filters on each control change
      this.submitFilters();
    } else {
      // Do not submit filters, just update vis so controls are updated with latest value
      await this.updateNestedControls();
      this.drawVis();
    }
  }

  submitFilters = () => {
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

    this.vis.API.queryFilter.addFilters(newFilters, this.visParams.pinFilters);
  }

  clearControls = async () => {
    this.controls.forEach((control) => {
      control.clear();
    });
    await this.updateNestedControls();
    this.drawVis();
  }

  updateControlsFromKbn = async () => {
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

  hasChanges = () => {
    return this.controls.map((control) => {
      return control.hasChanged();
    })
      .reduce((a, b) => {
        return a || b;
      });
  }

  hasValues = () => {
    return this.controls.map((control) => {
      return control.hasValue();
    })
      .reduce((a, b) => {
        return a || b;
      });
  }

  refreshControl = async (controlIndex, query) => {
    await this.controls[controlIndex].fetch(query);
    this.drawVis();
  }
}

export { VisController };
