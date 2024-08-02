/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import deepEqual from 'react-fast-compare';
import { PublishingSubject } from '@kbn/presentation-publishing';
import { OptionsListControlState } from './types';
import { OptionsListSelection } from '../../../../common/options_list/options_list_selections';

export function initializeOptionsListSelections(
  initialState: OptionsListControlState,
  onSelectionChange: () => void
) {
  const selectedOptions$ = new BehaviorSubject<OptionsListSelection[] | undefined>(
    initialState.selectedOptions ?? []
  );
  const existsSelected$ = new BehaviorSubject<boolean | undefined>(initialState.existsSelected);
  const exclude$ = new BehaviorSubject<boolean | undefined>(initialState.exclude);

  const selectedOptionsComparatorFunction = (
    a: OptionsListSelection[] | undefined,
    b: OptionsListSelection[] | undefined
  ) => deepEqual(a ?? [], b ?? []);

  return {
    clearSelections: () => {
      selectedOptions$.next(undefined);
      existsSelected$.next(false);
      exclude$.next(false);
      onSelectionChange();
    },
    hasInitialSelections: initialState.selectedOptions?.length || initialState.existsSelected,
    selectedOptions$: selectedOptions$ as PublishingSubject<OptionsListSelection[] | undefined>,
    selectedOptionsComparatorFunction,
    setSelectedOptions: (next: OptionsListSelection[] | undefined) => {
      if (selectedOptionsComparatorFunction(selectedOptions$.value, next)) {
        selectedOptions$.next(next);
        onSelectionChange();
      }
    },
    existsSelected$: existsSelected$ as PublishingSubject<boolean | undefined>,
    setExistsSelected: (next: boolean | undefined) => {
      if (existsSelected$.value !== next) {
        existsSelected$.next(next);
        onSelectionChange();
      }
    },
    exclude$: exclude$ as PublishingSubject<boolean | undefined>,
    setExclude: (next: boolean | undefined) => {
      if (exclude$.value !== next) {
        exclude$.next(next);
        onSelectionChange();
      }
    },
  };
}
