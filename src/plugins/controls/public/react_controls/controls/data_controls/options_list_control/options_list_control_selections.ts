/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import deepEqual from 'react-fast-compare';
import { PublishingSubject, StateComparators } from '@kbn/presentation-publishing';
import { OptionsListControlState } from './types';
import { OptionsListSelection } from '../../../../../common/options_list/options_list_selections';

export function initializeOptionsListSelections(
  initialState: OptionsListControlState,
  onSelectionChange: () => void
) {
  const selectedOptions$ = new BehaviorSubject<OptionsListSelection[] | undefined>(
    initialState.selectedOptions ?? []
  );
  const selectedOptionsComparatorFunction = (
    a: OptionsListSelection[] | undefined,
    b: OptionsListSelection[] | undefined
  ) => deepEqual(a ?? [], b ?? []);
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
    comparators: {
      exclude: [exclude$, setExclude],
      existsSelected: [existsSelected$, setExistsSelected],
      selectedOptions: [selectedOptions$, setSelectedOptions, selectedOptionsComparatorFunction],
    } as StateComparators<
      Pick<OptionsListControlState, 'exclude' | 'existsSelected' | 'selectedOptions'>
    >,
    hasInitialSelections: initialState.selectedOptions?.length || initialState.existsSelected,
    selectedOptions$: selectedOptions$ as PublishingSubject<OptionsListSelection[] | undefined>,
    setSelectedOptions,
    existsSelected$: existsSelected$ as PublishingSubject<boolean | undefined>,
    setExistsSelected,
    exclude$: exclude$ as PublishingSubject<boolean | undefined>,
    setExclude,
  };
}
