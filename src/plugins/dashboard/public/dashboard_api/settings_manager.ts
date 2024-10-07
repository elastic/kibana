/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeTitles } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { DashboardState } from './types';

export function initializeSettingsManager(initialState: DashboardState) {
  const timeRestore$ = new BehaviorSubject<boolean | undefined>(initialState.timeRestore);
  const titleManager = initializeTitles(initialState);

  return {
    api: {
      timeRestore$,
      ...titleManager.titlesApi,
    },
    internalApi: {
      reset: (lastSavedState: DashboardState) => {
        timeRestore$.next(lastSavedState.timeRestore);
      },
    },
  };
}
