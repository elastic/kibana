/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_CONTROL_STYLE } from './control_group/control_group_constants';
import { ControlGroupRuntimeState } from './control_group/types';
import { OptionsListControlState } from './options_list';
import { DefaultDataControlState, SerializedControlState } from './types';

export const mockDataControlState = {
  id: 'id',
  fieldName: 'sample field',
  dataViewId: 'sample id',
  value: ['0', '10'],
} as DefaultDataControlState;

export const mockOptionsListControlState = {
  ...mockDataControlState,
  selectedOptions: [],
  runPastTimeout: false,
  singleSelect: false,
  exclude: false,
} as OptionsListControlState;

export const getDefaultControlGroupState =
  (): ControlGroupRuntimeState<SerializedControlState> => ({
    initialChildControlState: {},
    labelPosition: DEFAULT_CONTROL_STYLE,
    chainingSystem: 'HIERARCHICAL',
    autoApplySelections: true,
    ignoreParentSettings: {
      ignoreFilters: false,
      ignoreQuery: false,
      ignoreTimerange: false,
      ignoreValidations: false,
    },
  });
