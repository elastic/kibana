/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { RangeSliderControlState, RangeSliderValue } from '@kbn/controls-schemas';

export function initializeRangeControlSelections(
  initialState: RangeSliderControlState,
  onSelectionChange: () => void
) {
  const value$ = new BehaviorSubject<RangeSliderValue | undefined>(initialState.value);
  const hasRangeSelection$ = new BehaviorSubject<boolean>(Boolean(value$.getValue()));

  function setValue(next: RangeSliderValue | undefined) {
    if (value$.value !== next) {
      value$.next(next);
      hasRangeSelection$.next(Boolean(next));
      onSelectionChange();
    }
  }

  return {
    value$: value$ as PublishingSubject<RangeSliderValue | undefined>,
    hasRangeSelection$: hasRangeSelection$ as PublishingSubject<boolean | undefined>,
    setValue,
  };
}
