/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlGroupRuntimeState, OptionsListControlState } from '@kbn/controls-plugin/public';
import { Filter } from '@kbn/es-query';
import { ALERT_DURATION, ALERT_RULE_NAME, ALERT_START, ALERT_STATUS } from '@kbn/rule-data-utils';

export interface ControlGroupOutput {
  loading: boolean;
  rendered: boolean;
  dataViewIds: string[];
  filters: Filter[];
}

export const sampleOutputData: ControlGroupOutput = {
  loading: false,
  rendered: true,
  dataViewIds: ['alert-filters-test-dv'],
  filters: [
    {
      meta: {
        index: 'alert-filters-test-dv',
        key: 'kibana.alert.building_block_type',
        negate: true,
      },
      query: {
        exists: {
          field: 'kibana.alert.building_block_type',
        },
      },
    },
  ],
};

export const initialInputData: ControlGroupRuntimeState<OptionsListControlState> = {
  initialChildControlState: {
    '0': {
      type: 'optionsListControl',
      order: 0,
      width: 'small',
      dataViewId: 'alert-filters-test-dv',
      fieldName: ALERT_STATUS,
      title: 'Status',
      hideExclude: true,
      hideSort: true,
      placeholder: '',
      selectedOptions: [],
      existsSelected: false,
      exclude: false,
    },
    '1': {
      type: 'optionsListControl',
      order: 1,
      width: 'small',
      dataViewId: 'alert-filters-test-dv',
      fieldName: ALERT_RULE_NAME,
      title: 'Rule',
      hideExclude: true,
      hideSort: true,
      placeholder: '',
      selectedOptions: [],
      existsSelected: false,
      exclude: false,
    },
    '2': {
      type: 'optionsListControl',
      order: 2,
      width: 'small',
      dataViewId: 'alert-filters-test-dv',
      fieldName: ALERT_START,
      title: 'Started at',
      hideExclude: true,
      hideSort: true,
      placeholder: '',
      selectedOptions: [],
      existsSelected: true,
      exclude: true,
    },
    '3': {
      type: 'optionsListControl',
      order: 3,
      width: 'small',
      dataViewId: 'alert-filters-test-dv',
      fieldName: ALERT_DURATION,
      title: 'Duration',
      hideExclude: true,
      hideSort: true,
      placeholder: '',
      selectedOptions: [],
      existsSelected: false,
      exclude: false,
    },
    '4': {
      type: 'optionsListControl',
      order: 4,
      width: 'small',
      dataViewId: 'alert-filters-test-dv',
      fieldName: 'host.name',
      title: 'Host',
      hideExclude: true,
      hideSort: true,
      placeholder: '',
      selectedOptions: [],
      existsSelected: false,
      exclude: false,
    },
  },
  labelPosition: 'oneLine',
  chainingSystem: 'HIERARCHICAL',
  autoApplySelections: true,
  ignoreParentSettings: {
    ignoreFilters: false,
    ignoreQuery: false,
    ignoreTimerange: false,
    ignoreValidations: false,
  },
};
