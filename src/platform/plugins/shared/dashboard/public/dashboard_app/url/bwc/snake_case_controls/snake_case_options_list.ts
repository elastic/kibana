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
      fieldName,
      exclude,
      runPastTimeout,
      searchTechnique,
      selectedOptions,
      singleSelect,
      sort,
      title,
    } = state as StoredOptionsListExplicitInput & { dataViewId?: string };
    return {
      data_view_id: dataViewId ?? '',
      display_settings: {
        hide_action_bar: displaySettings?.hideActionBar,
        hide_exclude: displaySettings?.hideExclude,
        hide_exists: displaySettings?.hideExists,
        hide_sort: displaySettings?.hideSort,
        placeholder: displaySettings?.placeholder,
      },
      field_name: fieldName ?? '',
      exclude,
      run_past_timeout: runPastTimeout,
      search_technique: searchTechnique as OptionsListDSLControlState['search_technique'],
      selected_options: selectedOptions,
      single_select: singleSelect,
      sort: sort as OptionsListDSLControlState['sort'],
      title,
    };
    //
  } else {
    return state as OptionsListDSLControlState;
  }
}
