/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'react-fast-compare';
import { StateComparators } from '@kbn/presentation-publishing';
import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';
import { OptionsListControlState } from '../../../../common/options_list';
import { OptionsListSelection } from '../../../../common/options_list/options_list_selections';

function areSelectedOptionsEqual(
  a: OptionsListSelection[] | undefined,
  b: OptionsListSelection[] | undefined
) {
  return deepEqual(a ?? [], b ?? []);
}

export const selectionComparators: StateComparators<
  Pick<OptionsListControlState, 'exclude' | 'existsSelected' | 'selectedOptions'>
> = {
  exclude: 'referenceEquality',
  existsSelected: 'referenceEquality',
  selectedOptions: areSelectedOptionsEqual,
};

export const defaultSelectionState = {
  exclude: false,
  existsSelected: false,
  selectedOptions: [],
};

export type SelectionsState = Pick<
  OptionsListControlState,
  'exclude' | 'existsSelected' | 'selectedOptions'
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
    api: {
      ...selectionsManager.api,
      hasInitialSelections: initialState.selectedOptions?.length || initialState.existsSelected,
    },
  };
}
