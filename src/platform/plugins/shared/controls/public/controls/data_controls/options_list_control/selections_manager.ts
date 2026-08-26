/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'react-fast-compare';

import type { OptionsListDSLControlState, OptionsListSelection } from '@kbn/controls-schemas';
import type { StateComparators } from '@kbn/presentation-publishing';
import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';
import { DEFAULT_DSL_OPTIONS_LIST_STATE } from '@kbn/controls-constants';

function areSelectedOptionsEqual(
  a: OptionsListSelection[] | undefined,
  b: OptionsListSelection[] | undefined
) {
  return deepEqual(a ?? [], b ?? []);
}

export const selectionComparators: StateComparators<
  Pick<OptionsListDSLControlState, 'exclude' | 'exists_selected' | 'selected_options' | 'sort'>
> = {
  exclude: 'referenceEquality',
  exists_selected: 'referenceEquality',
  selected_options: areSelectedOptionsEqual,
  sort: 'deepEquality',
};

export const defaultSelectionState = {
  exclude: DEFAULT_DSL_OPTIONS_LIST_STATE.exclude,
  exists_selected: DEFAULT_DSL_OPTIONS_LIST_STATE.exists_selected,
  selected_options: DEFAULT_DSL_OPTIONS_LIST_STATE.selected_options,
  sort: DEFAULT_DSL_OPTIONS_LIST_STATE.sort,
};

export type SelectionsState = Pick<
  OptionsListDSLControlState,
  'exclude' | 'exists_selected' | 'selected_options' | 'sort'
>;

export function initializeSelectionsManager(initialState: SelectionsState) {
  const selectionsManager = initializeStateManager<SelectionsState>(
    initialState,
    defaultSelectionState,
    selectionComparators
  );

  return {
    ...selectionsManager,
    internalApi: {
      hasInitialSelections: Boolean(
        initialState.selected_options?.length || initialState.exists_selected
      ),
    },
  };
}
