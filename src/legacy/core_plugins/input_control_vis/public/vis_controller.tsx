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

import { I18nStart } from 'kibana/public';
import { Vis, VisParams, SearchSource } from './legacy_imports';

import { InputControlVis } from './components/vis/input_control_vis';
import { getControlFactory } from './control/control_factory';
import { getLineageMap } from './lineage';
import { ControlParams } from './editor_utils';
import { RangeControl } from './control/range_control_factory';
import { ListControl } from './control/list_control_factory';
import { InputControlVisDependencies } from './plugin';
import { FilterManager, esFilters } from '../../../../plugins/data/public';

export const createInputControlVisController = (deps: InputControlVisDependencies) => {
  return class InputControlVisController {
    private I18nContext?: I18nStart['Context'];

    controls: Array<RangeControl | ListControl>;
    queryBarUpdateHandler: () => void;
    filterManager: FilterManager;
    updateSubsciption: any;
    visParams?: VisParams;

    constructor(public el: Element, public vis: Vis) {
      this.controls = [];

      this.queryBarUpdateHandler = this.updateControlsFromKbn.bind(this);

      this.filterManager = deps.data.query.filterManager;
      this.updateSubsciption = this.filterManager
        .getUpdates$()
        .subscribe(this.queryBarUpdateHandler);
    }

    async render(visData: any, visParams: VisParams, status: any) {
      if (status.params || (visParams.useTimeFilter && status.time)) {
        this.visParams = visParams;
        this.controls = [];
        this.controls = await this.initControls();
        const [{ i18n }] = await deps.core.getStartServices();
        this.I18nContext = i18n.Context;
        this.drawVis();
      }
    }

    destroy() {
      this.updateSubsciption.unsubscribe();
      unmountComponentAtNode(this.el);
      this.controls.forEach(control => control.destroy());
    }

    drawVis = () => {
      if (!this.I18nContext) {
        throw new Error('no i18n context found');
      }

      render(
        <this.I18nContext>
          <InputControlVis
            updateFiltersOnChange={this.visParams?.updateFiltersOnChange}
            controls={this.controls}
            stageFilter={this.stageFilter}
            submitFilters={this.submitFilters}
            resetControls={this.updateControlsFromKbn}
            clearControls={this.clearControls}
            hasChanges={this.hasChanges}
            hasValues={this.hasValues}
            refreshControl={this.refreshControl}
          />
        </this.I18nContext>,
        this.el
      );
    };

    async initControls() {
      const controlParamsList = (this.visParams?.controls as ControlParams[])?.filter(
        controlParams => {
          // ignore controls that do not have indexPattern or field
          return controlParams.indexPattern && controlParams.fieldName;
        }
      );

      const controlFactoryPromises = controlParamsList.map(controlParams => {
        const factory = getControlFactory(controlParams);
        return factory(controlParams, this.visParams?.useTimeFilter, SearchSource, deps);
      });
      const controls = await Promise.all<RangeControl | ListControl>(controlFactoryPromises);

      const getControl = (controlId: string) => {
        return controls.find(({ id }) => id === controlId);
      };

      const controlInitPromises: Array<Promise<void>> = [];
      getLineageMap(controlParamsList).forEach((lineage, controlId) => {
        // first lineage item is the control. remove it
        lineage.shift();
        const ancestors: Array<RangeControl | ListControl> = [];
        lineage.forEach(ancestorId => {
          const control = getControl(ancestorId);

          if (control) {
            ancestors.push(control);
          }
        });
        const control = getControl(controlId);

        if (control) {
          control.setAncestors(ancestors);
          controlInitPromises.push(control.fetch());
        }
      });

      await Promise.all(controlInitPromises);
      return controls;
    }

    stageFilter = async (controlIndex: number, newValue: any) => {
      this.controls[controlIndex].set(newValue);
      if (this.visParams?.updateFiltersOnChange) {
        // submit filters on each control change
        this.submitFilters();
      } else {
        // Do not submit filters, just update vis so controls are updated with latest value
        await this.updateNestedControls();
        this.drawVis();
      }
    };

    submitFilters = () => {
      const stagedControls = this.controls.filter(control => {
        return control.hasChanged();
      });

      const newFilters = stagedControls
        .map(control => control.getKbnFilter())
        .filter((filter): filter is esFilters.Filter => {
          return filter !== null;
        });

      stagedControls.forEach(control => {
        // to avoid duplicate filters, remove any old filters for control
        control.filterManager.findFilters().forEach(existingFilter => {
          this.filterManager.removeFilter(existingFilter);
        });
      });

      // Clean up filter pills for nested controls that are now disabled because ancestors are not set.
      // This has to be done after looking up the staged controls because otherwise removing a filter
      // will re-sync the controls of all other filters.
      this.controls.map(control => {
        if (control.hasAncestors() && control.hasUnsetAncestor()) {
          control.filterManager.findFilters().forEach(existingFilter => {
            this.filterManager.removeFilter(existingFilter);
          });
        }
      });

      this.filterManager.addFilters(newFilters, this.visParams?.pinFilters);
    };

    clearControls = async () => {
      this.controls.forEach(control => {
        control.clear();
      });
      await this.updateNestedControls();
      this.drawVis();
    };

    updateControlsFromKbn = async () => {
      this.controls.forEach(control => {
        control.reset();
      });
      await this.updateNestedControls();
      this.drawVis();
    };

    async updateNestedControls() {
      const fetchPromises = this.controls.map(async control => {
        if (control.hasAncestors()) {
          await control.fetch();
        }
      });
      return await Promise.all(fetchPromises);
    }

    hasChanges = () => {
      return this.controls.map(control => control.hasChanged()).some(control => control);
    };

    hasValues = () => {
      return this.controls
        .map(control => {
          return control.hasValue();
        })
        .reduce((a, b) => {
          return a || b;
        });
    };

    refreshControl = async (controlIndex: number, query: any) => {
      await this.controls[controlIndex].fetch(query);
      this.drawVis();
    };
  };
};
