/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { PublishingSubject, StateComparators } from '@kbn/presentation-publishing';
import { RangeValue, RangesliderControlState } from './types';

export function initializeRangeControlSelections(
  initialState: RangesliderControlState,
  onSelectionChange: () => void
) {
  const value$ = new BehaviorSubject<RangeValue | undefined>(initialState.value);
  function setValue(next: RangeValue | undefined) {
    if (value$.value !== next) {
      value$.next(next);
      onSelectionChange();
    }
  }

  return {
    comparators: {
      value: [value$, setValue],
    } as StateComparators<Pick<RangesliderControlState, 'value'>>,
    hasInitialSelections: initialState.value !== undefined,
    value$: value$ as PublishingSubject<RangeValue | undefined>,
    setValue,
  };
}
