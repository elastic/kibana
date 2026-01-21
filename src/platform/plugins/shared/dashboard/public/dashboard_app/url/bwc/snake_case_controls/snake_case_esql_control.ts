/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  OptionsListESQLControlState,
  StoredESQLControlExplicitInput,
} from '@kbn/controls-schemas';

export function snakeCaseESQLControl(state: {
  [key: string]: unknown;
}): OptionsListESQLControlState {
  if ('variableName' in state) {
    const {
      availableOptions,
      controlType,
      displaySettings,
      selectedOptions,
      singleSelect,
      variableName,
      variableType,
      esqlQuery,
    } = state as StoredESQLControlExplicitInput;
    return {
      ...(availableOptions && { available_options: availableOptions }),
      control_type: controlType as OptionsListESQLControlState['control_type'],
      ...(displaySettings && {
        display_settings: {
          ...(displaySettings.hideActionBar !== undefined && {
            hide_action_bar: displaySettings.hideActionBar,
          }),
          ...(displaySettings.hideExclude !== undefined && {
            hide_exclude: displaySettings.hideExclude,
          }),
          ...(displaySettings.hideExists !== undefined && {
            hide_exists: displaySettings.hideExists,
          }),
          ...(displaySettings.hideSort !== undefined && {
            hide_sort: displaySettings.hideSort,
          }),
          ...(displaySettings.placeholder && {
            placeholder: displaySettings.placeholder,
          }),
        },
      }),
      ...(selectedOptions && { selected_options: selectedOptions }),
      ...(singleSelect !== undefined && { single_select: singleSelect }),
      variable_name: variableName,
      variable_type: variableType as OptionsListESQLControlState['variable_type'],
      esql_query: esqlQuery,
    };
    //
  } else {
    return state as OptionsListESQLControlState;
  }
}
