/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { combineLatest, distinctUntilChanged, map, type Observable, shareReplay } from 'rxjs';
import { createState } from './state_helpers';

export interface FeedbackStateDeps {
  isEnabled$: Observable<boolean>;
  urlParams$: Observable<URLSearchParams | undefined>;
  isSideNavCollapsed$: Observable<boolean>;
}

export interface FeedbackState {
  isEnabled$: Observable<boolean>;
  urlParams$: Observable<URLSearchParams | undefined>;
  isBtnVisible$: Observable<boolean>;
  setIsBtnVisible: (isVisible: boolean) => void;
}

export const createFeedbackState = ({
  isEnabled$,
  urlParams$,
  isSideNavCollapsed$,
}: FeedbackStateDeps): FeedbackState => {
  const feedbackBtnVisible = createState(false);

  const isBtnVisible$ = combineLatest([feedbackBtnVisible.$, isSideNavCollapsed$, isEnabled$]).pipe(
    map(
      ([isVisible, isSideNavCollapsed, isEnabled]) => isVisible && !isSideNavCollapsed && isEnabled
    ),
    distinctUntilChanged(),
    shareReplay(1)
  );

  return {
    isEnabled$,
    urlParams$,
    isBtnVisible$,
    setIsBtnVisible: feedbackBtnVisible.set,
  };
};
