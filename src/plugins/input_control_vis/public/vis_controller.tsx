/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { isEqual } from 'lodash';
import { render, unmountComponentAtNode } from 'react-dom';
import { Subscription } from 'rxjs';

import { I18nStart } from '@kbn/core/public';
import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin';
import { Filter } from '@kbn/es-query';
import { VisualizationContainer } from '@kbn/visualizations-plugin/public';
import { FilterManager } from '@kbn/data-plugin/public';

import { InputControlVis } from './components/vis/input_control_vis';
import { getControlFactory } from './control/control_factory';
import { getLineageMap } from './lineage';
import { RangeControl } from './control/range_control_factory';
import { ListControl } from './control/list_control_factory';
import { InputControlVisDependencies } from './plugin';
import { InputControlVisParams } from './types';

export type InputControlVisControllerType = ReturnType<typeof createInputControlVisController>;

export const createInputControlVisController = (
  deps: InputControlVisDependencies,
  handlers: IInterpreterRenderHandlers,
  el: Element
) => {
  let I18nContext: I18nStart['Context'] | undefined;
  let isLoaded = false;

  return new (class InputControlVisController {
    controls: Array<RangeControl | ListControl>;
    queryBarUpdateHandler: () => void;
    filterManager: FilterManager;
    updateSubsciption: any;
    timeFilterSubscription: Subscription;
    visParams?: InputControlVisParams;

    constructor() {
      this.controls = [];

      this.queryBarUpdateHandler = this.updateControlsFromKbn.bind(this);

      this.filterManager = deps.data.query.filterManager;
      this.updateSubsciption = this.filterManager
        .getUpdates$()
        .subscribe(this.queryBarUpdateHandler);
      this.timeFilterSubscription = deps.data.query.timefilter.timefilter
        .getTimeUpdate$()
        .subscribe(() => {
          if (this.visParams?.useTimeFilter) {
            isLoaded = false;
          }
        });
    }

    async render(visParams: InputControlVisParams) {
      if (!I18nContext) {
        const [{ i18n }] = await deps.core.getStartServices();
        I18nContext = i18n.Context;
      }
      if (!isLoaded || !isEqual(visParams, this.visParams)) {
        this.visParams = visParams;
        this.controls = [];
        this.controls = await this.initControls(visParams);
        isLoaded = true;
      }
      this.drawVis();
    }

    destroy() {
      this.updateSubsciption.unsubscribe();
      this.timeFilterSubscription.unsubscribe();
      unmountComponentAtNode(el);
      this.controls.forEach((control) => control.destroy());
    }

    drawVis = () => {
      if (!I18nContext) {
        throw new Error('no i18n context found');
      }

      render(
        <I18nContext>
          <VisualizationContainer handlers={handlers}>
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
          </VisualizationContainer>
        </I18nContext>,
        el
      );
    };

    async initControls(visParams: InputControlVisParams) {
      const controlParamsList = visParams.controls.filter((controlParams) => {
        // ignore controls that do not have indexPattern or field
        return controlParams.indexPattern && controlParams.fieldName;
      });

      const controlFactoryPromises = controlParamsList.map((controlParams) => {
        const factory = getControlFactory(controlParams);

        return factory(controlParams, visParams.useTimeFilter, deps);
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
        lineage.forEach((ancestorId) => {
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
      const stagedControls = this.controls.filter((control) => {
        return control.hasChanged();
      });

      const newFilters = stagedControls
        .map((control) => control.getKbnFilter())
        .filter((filter): filter is Filter => {
          return filter !== null;
        });

      stagedControls.forEach((control) => {
        // to avoid duplicate filters, remove any old filters for control
        control.filterManager.findFilters().forEach((existingFilter) => {
          this.filterManager.removeFilter(existingFilter);
        });
      });

      // Clean up filter pills for nested controls that are now disabled because ancestors are not set.
      // This has to be done after looking up the staged controls because otherwise removing a filter
      // will re-sync the controls of all other filters.
      this.controls.map((control) => {
        if (control.hasAncestors() && control.hasUnsetAncestor()) {
          control.filterManager.findFilters().forEach((existingFilter) => {
            this.filterManager.removeFilter(existingFilter);
          });
        }
      });

      this.filterManager.addFilters(newFilters, this.visParams?.pinFilters);
    };

    clearControls = async () => {
      this.controls.forEach((control) => {
        control.clear();
      });
      await this.updateNestedControls();
      this.drawVis();
    };

    updateControlsFromKbn = async () => {
      this.controls.forEach((control) => {
        control.reset();
      });
      await this.updateNestedControls();
      this.drawVis();
    };

    async updateNestedControls() {
      const fetchPromises = this.controls.map(async (control) => {
        if (control.hasAncestors()) {
          await control.fetch();
        }
      });
      return await Promise.all(fetchPromises);
    }

    hasChanges = () => {
      return this.controls.map((control) => control.hasChanged()).some((control) => control);
    };

    hasValues = () => {
      return this.controls
        .map((control) => {
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
  })();
};
