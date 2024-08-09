/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { PublishingSubject, StateComparators } from '@kbn/presentation-publishing';
import { SearchControlState } from './types';

export function initializeSearchControlSelections(
  initialState: SearchControlState,
  onSelectionChange: () => void
) {
  const searchString$ = new BehaviorSubject<string | undefined>(initialState.searchString);
  function setSearchString(next: string | undefined) {
    if (searchString$.value !== next) {
      searchString$.next(next);
      onSelectionChange();
    }
  }

  return {
    comparators: {
      searchString: [searchString$, setSearchString],
    } as StateComparators<Pick<SearchControlState, 'searchString'>>,
    hasInitialSelections: initialState.searchString?.length,
    searchString$: searchString$ as PublishingSubject<string | undefined>,
    setSearchString,
  };
}
