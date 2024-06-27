/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  AddOptionsListControlProps,
  AddRangeSliderControlProps,
  ControlGroupApi,
} from '@kbn/controls-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { Filter } from '@kbn/es-query';
import type { Vis } from '@kbn/visualizations-plugin/public';
import { getSelectedOptionsFromFilter } from '../control/filter_manager/phrase_filter_manager';
import { getSelectedRangeFromFilter } from '../control/filter_manager/range_filter_manager';
import { ControlParams, CONTROL_TYPES } from '../editor_utils';
import type { InputControlVisParams } from '../types';

export function addToControls(
  controlGroup: ControlGroupApi,
  vis: Vis<InputControlVisParams>,
  dataService: DataPublicPluginStart
) {
  controlGroup.setAutoApplySelections(vis.params?.updateFiltersOnChange ?? true);
  controlGroup.setApplyGlobalTime(vis.params?.useTimeFilter ?? true);

  const orderedControls: ControlParams[] = [];
  if (vis.params?.controls) {
    function isRootControl(controlParams: ControlParams) {
      const parentId = controlParams.parent ?? '';
      return parentId === '';
    }
    // add root controls
    vis.params?.controls
      .filter(controlParams => isRootControl(controlParams))
      .forEach(controlParams => {
        orderedControls.push(controlParams);
      });
    // add child controls to right of parent control
    vis.params?.controls
      .filter(controlParams => !isRootControl(controlParams))
      .forEach(controlParams => {
        const parentIndex = orderedControls.findIndex(({ parent }) => parent === controlParams.parent);
        if (parentIndex > 0) {
          orderedControls.splice(parentIndex, 0, controlParams);
        } else {
          orderedControls.push(controlParams);
        }
      });
  }

  orderedControls.forEach((controlParams) => {
    const filter = dataService.query.filterManager
      .getFilters()
      .find(({ meta }) => meta.controlledBy === controlParams.id);
    if (filter) {
      dataService.query.filterManager.removeFilter(filter);
    }

    if (controlParams.type === CONTROL_TYPES.LIST) {
      controlGroup.addOptionsListControl(getOptionListProps(controlParams, filter));
    } else if (controlParams.type === CONTROL_TYPES.RANGE) {
      controlGroup.addRangeSliderControl(getRangeSliderProps(controlParams, filter));
    }
  });
}

// Maps input control option list props to control option list props
function getOptionListProps(legacyControlParams: ControlParams, filter?: Filter) {
  const controlProps: AddOptionsListControlProps = {
    controlId: legacyControlParams.id,
    dataViewId: legacyControlParams.indexPattern,
    fieldName: legacyControlParams.fieldName,
  };

  if (legacyControlParams.label) {
    controlProps.title = legacyControlParams.label;
  }

  if (typeof legacyControlParams.options.multiselect === 'boolean') {
    controlProps.singleSelect = !legacyControlParams.options.multiselect;
  }

  if (filter) {
    const selectedOptions = getSelectedOptionsFromFilter(filter, legacyControlParams.fieldName);
    if (selectedOptions) {
      controlProps.selectedOptions = (
        Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions]
      ).map((value) => String(value));
    }
  }

  return controlProps;
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
    const selectedRange = getSelectedRangeFromFilter(filter, legacyControlParams.fieldName);
    if (selectedRange && selectedRange.min !== undefined && selectedRange.max !== undefined) {
      controlProps.value = [String(selectedRange.min), String(selectedRange.max)];
    }
  }

  return controlProps;
}
