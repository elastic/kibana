/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'react-fast-compare';
import { BehaviorSubject, map, merge } from 'rxjs';

import { PublishingSubject, StateComparators } from '@kbn/presentation-publishing';

import { OptionsListControlState } from '../../../../common/options_list';
import { OptionsListSelection } from '../../../../common/options_list/options_list_selections';

function selectedOptionsComparatorFunction(
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
  selectedOptions: selectedOptionsComparatorFunction,
};

export function initializeOptionsListSelections(
  initialState: OptionsListControlState,
  onSelectionChange: () => void
) {
  const selectedOptions$ = new BehaviorSubject<OptionsListSelection[] | undefined>(
    initialState.selectedOptions ?? []
  );

  function setSelectedOptions(next: OptionsListSelection[] | undefined) {
    if (!selectedOptionsComparatorFunction(selectedOptions$.value, next)) {
      selectedOptions$.next(next);
      onSelectionChange();
    }
  }

  const existsSelected$ = new BehaviorSubject<boolean | undefined>(initialState.existsSelected);
  function setExistsSelected(next: boolean | undefined) {
    if (existsSelected$.value !== next) {
      existsSelected$.next(next);
      onSelectionChange();
    }
  }

  const exclude$ = new BehaviorSubject<boolean | undefined>(initialState.exclude);
  function setExclude(next: boolean | undefined) {
    if (exclude$.value !== next) {
      exclude$.next(next);
      onSelectionChange();
    }
  }

  return {
    anyStateChange$: merge(exclude$, existsSelected$, selectedOptions$).pipe(map(() => undefined)),
    getLatestState: () => {
      return {
        selectedOptions: selectedOptions$.getValue(),
        existsSelected: existsSelected$.getValue(),
        exclude: exclude$.getValue(),
      };
    },
    reinitializeState: (lastSaved?: OptionsListControlState) => {
      setExclude(lastSaved?.exclude);
      setExistsSelected(lastSaved?.existsSelected);
      setSelectedOptions(lastSaved?.selectedOptions ?? []);
    },
    stateManager: {
      selectedOptions: selectedOptions$ as PublishingSubject<OptionsListSelection[] | undefined>,
      existsSelected: existsSelected$ as PublishingSubject<boolean | undefined>,
      exclude: exclude$ as PublishingSubject<boolean | undefined>,
    },
    internalApi: {
      hasInitialSelections: initialState.selectedOptions?.length || initialState.existsSelected,
      setSelectedOptions,
      setExistsSelected,
      setExclude,
    },
  };
}
