/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'react-fast-compare';
import { DEFAULT_DSL_OPTIONS_LIST_STATE } from '@kbn/controls-constants';
import type { OptionsListDSLControlState, OptionsListSelection } from '@kbn/controls-schemas';
import type { SerializedStateComparison, StateComparators } from '@kbn/presentation-publishing';
import { dataControlComparators } from './data_control_state_comparison';

export const areSelectedOptionsEqual = (
  a: OptionsListSelection[] | undefined,
  b: OptionsListSelection[] | undefined
): boolean => deepEqual(a ?? [], b ?? []);

export const optionsListSelectionComparators: StateComparators<
  Pick<OptionsListDSLControlState, 'exclude' | 'exists_selected' | 'selected_options' | 'sort'>
> = {
  exclude: 'referenceEquality',
  exists_selected: 'referenceEquality',
  selected_options: areSelectedOptionsEqual,
  sort: 'deepEquality',
};

export const optionsListEditorComparators: StateComparators<
  Pick<OptionsListDSLControlState, 'search_technique' | 'single_select' | 'run_past_timeout'>
> = {
  run_past_timeout: 'referenceEquality',
  search_technique: 'referenceEquality',
  single_select: 'referenceEquality',
};

export const optionsListStateComparison: SerializedStateComparison<OptionsListDSLControlState> = {
  comparators: {
    ...dataControlComparators,
    ...optionsListSelectionComparators,
    ...optionsListEditorComparators,
    display_settings: 'deepEquality',
  },
  defaultState: {
    search_technique: DEFAULT_DSL_OPTIONS_LIST_STATE.search_technique,
    sort: DEFAULT_DSL_OPTIONS_LIST_STATE.sort,
    exclude: false,
    exists_selected: false,
  },
};
