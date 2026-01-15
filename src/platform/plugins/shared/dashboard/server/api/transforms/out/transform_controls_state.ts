/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';

import type { Reference } from '@kbn/content-management-utils';
import type { SerializableRecord } from '@kbn/utility-types';
import type {
  ControlsGroupState,
  OptionsListControlState,
  OptionsListDSLControlState,
  OptionsListESQLControlState,
  RangeSliderControlState,
  StoredESQLControlExplicitInput,
  StoredOptionsListExplicitInput,
  StoredPinnedControls,
  StoredPinnedControlState,
  StoredRangeSliderExplicitInput,
  StoredTimeSliderExplicitInput,
  TimeSliderControlState,
} from '@kbn/controls-schemas';
import {
  ESQL_CONTROL,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';

import type { DashboardPinnedPanelsState as DashboardControlsState } from '../../../../common';
import { embeddableService, logger } from '../../../kibana_services';

/**
 * Transform functions for serialized controls state.
 */
export const transformControlsState: (
  serializedControlState: string,
  containerReferences: Reference[]
) => DashboardControlsState = (serializedControlState, containerReferences) => {
  const state = flow(
    JSON.parse,
    transformControlObjectToArray,
    transformControlProperties
  )(serializedControlState);
  return injectControlReferences(state, containerReferences);
};

function transformControlObjectToArray(
  controls: StoredPinnedControls
): Array<StoredPinnedControlState> {
  return Object.entries(controls).map(([id, control]) => ({ ...control, id }));
}

function snakeCaseControlExplicitInput(
  type: string,
  explicitInput: StoredPinnedControlState['explicitInput']
): OptionsListControlState | RangeSliderControlState | TimeSliderControlState {
  switch (type) {
    case OPTIONS_LIST_CONTROL: {
      const {
        dataViewRefName,
        displaySettings,
        exclude,
        existsSelected,
        fieldName,
        ignoreValidations,
        runPastTimeout,
        searchTechnique,
        selectedOptions,
        singleSelect,
        sort,
        useGlobalFilters,
      } = explicitInput as StoredOptionsListExplicitInput;
      return {
        dataViewRefName, // this will be dropped, so no need to snake case
        display_settings: displaySettings,
        exclude,
        exists_selected: existsSelected,
        field_name: fieldName,
        ignore_validations: ignoreValidations,
        run_past_timeout: runPastTimeout,
        search_technique: searchTechnique,
        selected_options: selectedOptions,
        single_select: singleSelect,
        sort,
        use_global_filters: useGlobalFilters,
      } as Omit<OptionsListDSLControlState, 'data_view_id'> & { dataViewRefName: string };
    }
    case ESQL_CONTROL: {
      const {
        availableOptions,
        controlType,
        displaySettings,
        esqlQuery,
        exclude,
        existsSelected,
        runPastTimeout,
        searchTechnique,
        selectedOptions,
        singleSelect,
        sort,
        variableName,
        variableType,
      } = explicitInput as StoredESQLControlExplicitInput;
      return {
        available_options: availableOptions,
        control_type: controlType,
        display_settings: displaySettings,
        esql_query: esqlQuery,
        exclude,
        exists_selected: existsSelected,
        run_past_timeout: runPastTimeout,
        search_technique: searchTechnique,
        selected_options: selectedOptions,
        single_select: singleSelect,
        sort,
        variable_name: variableName,
        variable_type: variableType,
      } as OptionsListESQLControlState;
    }
    case RANGE_SLIDER_CONTROL: {
      const { dataViewRefName, fieldName, ignoreValidations, step, useGlobalFilters, value } =
        explicitInput as StoredRangeSliderExplicitInput;
      return {
        dataViewRefName, // this will be dropped, so no need to snake case
        field_name: fieldName,
        ignore_validations: ignoreValidations,
        step,
        use_global_filters: useGlobalFilters,
        value,
      } as RangeSliderControlState;
    }
    case TIME_SLIDER_CONTROL: {
      const {
        isAnchored,
        timesliceEndAsPercentageOfTimeRange,
        timesliceStartAsPercentageOfTimeRange,
      } = explicitInput as StoredTimeSliderExplicitInput;
      return {
        is_anchored: isAnchored,
        time_slice_end_as_percentage_of_time_range: timesliceEndAsPercentageOfTimeRange,
        time_slice_start_as_percentage_of_time_range: timesliceStartAsPercentageOfTimeRange,
      } as TimeSliderControlState;
    }
  }
}

function transformControlProperties(controls: Array<StoredPinnedControlState>) {
  return controls
    .sort(({ order: orderA = 0 }, { order: orderB = 0 }) => orderA - orderB)
    .map(({ explicitInput, id, type, grow, width }) => {
      return {
        uid: id,
        type,
        ...(grow !== undefined && { grow }),
        ...(width !== undefined && { width }),
        config: explicitInput as SerializableRecord,
      };
    });
}

function injectControlReferences(
  controls: ControlsGroupState,
  containerReferences: Reference[]
): DashboardControlsState {
  const transformedControls: DashboardControlsState = [];

  controls.forEach((control) => {
    const transforms = embeddableService.getTransforms(control.type);
    const { config, ...rest } = control;
    if (transforms?.transformOut) {
      try {
        transformedControls.push({
          ...rest,
          config: transforms.transformOut(config, [], containerReferences, control.uid),
        } as DashboardControlsState[number]);
      } catch (transformOutError) {
        // do not prevent read on transformOutError
        logger.warn(
          `Unable to transform "${control.type}" embeddable state on read. Error: ${transformOutError.message}`
        );
      }
    } else {
      transformedControls.push({ ...rest, config } as DashboardControlsState[number]);
    }
  });
  return transformedControls;
}
