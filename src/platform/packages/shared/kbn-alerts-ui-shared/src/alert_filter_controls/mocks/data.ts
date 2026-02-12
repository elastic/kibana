/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlGroupRuntimeState } from '@kbn/control-group-renderer';
import type { OptionsListDSLControlState } from '@kbn/controls-schemas';
import type { Filter } from '@kbn/es-query';
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

export const initialInputData: ControlGroupRuntimeState<OptionsListDSLControlState> = {
  initialChildControlState: {
    '0': {
      type: 'optionsListControl',
      order: 0,
      width: 'small',
      dataViewId: 'alert-filters-test-dv',
      fieldName: ALERT_STATUS,
      title: 'Status',
      selectedOptions: [],
      existsSelected: false,
      exclude: false,
      displaySettings: {
        hideExclude: true,
        hideSort: true,
        placeholder: '',
      },
    },
    '1': {
      type: 'optionsListControl',
      order: 1,
      width: 'small',
      dataViewId: 'alert-filters-test-dv',
      fieldName: ALERT_RULE_NAME,
      title: 'Rule',
      selectedOptions: [],
      existsSelected: false,
      exclude: false,
      displaySettings: {
        hideExclude: true,
        hideSort: true,
        placeholder: '',
      },
    },
    '2': {
      type: 'optionsListControl',
      order: 2,
      width: 'small',
      dataViewId: 'alert-filters-test-dv',
      fieldName: ALERT_START,
      title: 'Started at',
      selectedOptions: [],
      existsSelected: true,
      exclude: true,
      displaySettings: {
        hideExclude: true,
        hideSort: true,
        placeholder: '',
      },
    },
    '3': {
      type: 'optionsListControl',
      order: 3,
      width: 'small',
      dataViewId: 'alert-filters-test-dv',
      fieldName: ALERT_DURATION,
      title: 'Duration',
      selectedOptions: [],
      existsSelected: false,
      exclude: false,
      displaySettings: {
        hideExclude: true,
        hideSort: true,
        placeholder: '',
      },
    },
    '4': {
      type: 'optionsListControl',
      order: 4,
      width: 'small',
      dataViewId: 'alert-filters-test-dv',
      fieldName: 'host.name',
      title: 'Host',
      selectedOptions: [],
      existsSelected: false,
      exclude: false,
      displaySettings: {
        hideExclude: true,
        hideSort: true,
        placeholder: '',
      },
    },
  },
  ignoreParentSettings: {
    ignoreFilters: false,
    ignoreQuery: false,
    ignoreTimerange: false,
    ignoreValidations: false,
  },
};
