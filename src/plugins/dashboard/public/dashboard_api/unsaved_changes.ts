/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { DashboardState } from './types';

export function initializeUnsavedChanges({
  anyMigrationRun,
  lastSavedInput,
  resetControlGroup,
  resetPanels,
}: {
  anyMigrationRun: boolean;
  lastSavedInput: DashboardState;
  resetControlGroup: () => Promise<void>;
  resetPanels: () => void;
  resetUnifiedSearch: (lastSavedState: DashboardState) => void;
}) {
  const hasRunMigrations$ = new BehaviorSubject(anyMigrationRun);
  const hasUnsavedChanges$ = new BehaviorSubject(false);
  const lastSavedInput$ = new BehaviorSubject<DashboardState>(lastSavedInput);

  return {
    asyncResetToLastSavedState: async () => {
      this.dispatch.resetToLastSavedInput(this.lastSavedInput$.value);
      const {
        explicitInput: { timeRange, refreshInterval },
      } = this.getState();

      const { timeRestore: lastSavedTimeRestore } = lastSavedInput$.value;

      await resetControlGroup();

      // if we are using the unified search integration, we need to force reset the time picker.
      if (this.creationOptions?.useUnifiedSearchIntegration && lastSavedTimeRestore) {
        const timeFilterService = dataService.query.timefilter.timefilter;
        if (timeRange) timeFilterService.setTime(timeRange);
        if (refreshInterval) timeFilterService.setRefreshInterval(refreshInterval);
      }
      resetPanels();
    },
    hasRunMigrations$,
    hasUnsavedChanges$,
    lastSavedInput$,
    setHasUnsavedChanges: (hasUnsavedChanges: boolean) =>
      hasUnsavedChanges$.next(hasUnsavedChanges),
    setLastSavedInput: (input: DashboardState) => {
      lastSavedInput$.next(input);

      // if we set the last saved input, it means we have saved this Dashboard - therefore clientside migrations have
      // been serialized into the SO.
      hasRunMigrations$.next(false);
    },
  };
}
