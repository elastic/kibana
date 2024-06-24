/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AddRangeSliderControlProps, ControlGroupApi } from '@kbn/controls-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { Filter } from '@kbn/es-query';
import type { Vis } from '@kbn/visualizations-plugin/public';
import { getRangeValueFromFilter } from '../control/filter_manager/range_filter_manager';
import { ControlParams, CONTROL_TYPES } from '../editor_utils';
import type { InputControlVisParams } from '../types';

export function addToControls(
  controlGroup: ControlGroupApi,
  vis: Vis<InputControlVisParams>,
  dataService: DataPublicPluginStart
) {
  console.log('controlGroup', controlGroup);
  console.log('vis', vis);
  vis.params.controls.forEach((controlParams) => {
    if (controlParams.type === CONTROL_TYPES.LIST) {
    } else if (controlParams.type === CONTROL_TYPES.RANGE) {
      const filter = dataService.query.filterManager
        .getFilters()
        .find(({ meta }) => meta.controlledBy === controlParams.id);
      controlGroup.addRangeSliderControl(getRangeSliderProps(controlParams, filter));
      if (filter) {
        dataService.query.filterManager.removeFilter(filter);
      }
    }
  });
}

// Maps input control range slider props to control range slider props
function getRangeSliderProps(legacyControlParams: ControlParams, filter?: Filter) {
  const controlProps: AddRangeSliderControlProps = {
    controlId: legacyControlParams.id,
    dataViewId: legacyControlParams.indexPattern,
    fieldName: legacyControlParams.fieldName,
  };

  if (legacyControlParams.options?.step) {
    controlProps.step = legacyControlParams.options?.step;
  }

  if (legacyControlParams.label) {
    controlProps.title = legacyControlParams.label;
  }

  if (filter) {
    const selectedRange = getRangeValueFromFilter(filter, legacyControlParams.fieldName);
    if (selectedRange && selectedRange.min !== undefined && selectedRange.max !== undefined) {
      controlProps.value = [String(selectedRange.min), String(selectedRange.max)];
    }
  }

  return controlProps;
}
