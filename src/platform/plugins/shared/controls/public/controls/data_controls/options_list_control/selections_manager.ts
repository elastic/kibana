/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'react-fast-compare';

import type { OptionsListControlState, OptionsListSelection } from '@kbn/controls-schemas';
import type { StateComparators } from '@kbn/presentation-publishing';
import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';

import { OPTIONS_LIST_DEFAULT_SORT } from '@kbn/controls-constants';

function areSelectedOptionsEqual(
  a: OptionsListSelection[] | undefined,
  b: OptionsListSelection[] | undefined
) {
  return deepEqual(a ?? [], b ?? []);
}

export const selectionComparators: StateComparators<
  Pick<OptionsListControlState, 'exclude' | 'existsSelected' | 'selectedOptions' | 'sort'>
> = {
  exclude: 'referenceEquality',
  existsSelected: 'referenceEquality',
  selectedOptions: areSelectedOptionsEqual,
  sort: 'deepEquality',
};

export const defaultSelectionState = {
  exclude: false,
  existsSelected: false,
  selectedOptions: [],
  sort: OPTIONS_LIST_DEFAULT_SORT,
};

export type SelectionsState = Pick<
  OptionsListControlState,
  'exclude' | 'existsSelected' | 'selectedOptions' | 'sort'
>;

export function initializeSelectionsManager(initialState: SelectionsState) {
  const selectionsManager = initializeStateManager<SelectionsState>(
    {
      ...initialState,
      selectedOptions: initialState.selectedOptions ?? [],
    },
    defaultSelectionState,
    selectionComparators
  );

  return {
    ...selectionsManager,
    internalApi: {
      hasInitialSelections: Boolean(
        initialState.selectedOptions?.length || initialState.existsSelected
      ),
    },
  };
}
