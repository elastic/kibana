/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  OptionsListDSLControlState,
  StoredOptionsListExplicitInput,
} from '@kbn/controls-schemas';

export function snakeCaseOptionsList(state: {
  [key: string]: unknown;
}): OptionsListDSLControlState {
  if ('dataViewId' in state) {
    const {
      dataViewId,
      displaySettings,
      exclude,
      fieldName,
      ignoreValidations,
      runPastTimeout,
      searchTechnique,
      selectedOptions,
      singleSelect,
      sort,
      title,
      useGlobalFilters,
    } = state as StoredOptionsListExplicitInput & { dataViewId?: string };
    return {
      data_view_id: dataViewId ?? '',
      field_name: fieldName ?? '',

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
      ...(exclude !== undefined && { exclude }),
      ...(ignoreValidations !== undefined && { ignore_validations: ignoreValidations }),
      ...(runPastTimeout && { run_past_timeout: runPastTimeout }),
      ...(searchTechnique && {
        search_technique: searchTechnique as OptionsListDSLControlState['search_technique'],
      }),
      ...(selectedOptions && { selected_options: selectedOptions }),
      ...(singleSelect !== undefined && { single_select: singleSelect }),
      ...(sort && { sort: sort as OptionsListDSLControlState['sort'] }),
      ...(title && { title }),
      ...(useGlobalFilters !== undefined && { use_global_filters: useGlobalFilters }),
    };
    //
  } else {
    return state as OptionsListDSLControlState;
  }
}
