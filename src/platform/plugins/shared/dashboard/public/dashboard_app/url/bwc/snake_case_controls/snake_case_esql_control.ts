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
      available_options: availableOptions,
      control_type: controlType as OptionsListESQLControlState['control_type'],
      display_settings: {
        hide_action_bar: displaySettings?.hideActionBar,
        hide_exclude: displaySettings?.hideExclude,
        hide_exists: displaySettings?.hideExists,
        hide_sort: displaySettings?.hideSort,
        placeholder: displaySettings?.placeholder,
      },
      selected_options: selectedOptions,
      single_select: singleSelect,
      variable_name: variableName,
      variable_type: variableType as OptionsListESQLControlState['variable_type'],
      esql_query: esqlQuery,
    };
    //
  } else {
    return state as OptionsListESQLControlState;
  }
}
