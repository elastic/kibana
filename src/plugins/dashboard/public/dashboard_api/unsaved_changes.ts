/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { PublishingSubject } from '@kbn/presentation-publishing';
import { ControlGroupApi } from '@kbn/controls-plugin/public';
import { DashboardState } from './types';
import { initializePanelsManager } from './panels_manager';
import { initializeSettingsManager } from './settings_manager';
import { initializeUnifiedSearchManager } from './unified_search_manager';

export function initializeUnsavedChanges({
  anyMigrationRun,
  controlGroupApi$,
  lastSavedInput,
  panelsManager,
  settingsManager,
  unifiedSearchManager,
}: {
  anyMigrationRun: boolean;
  controlGroupApi$: PublishingSubject<ControlGroupApi | undefined>;
  lastSavedInput: DashboardState;
  panelsManager: ReturnType<typeof initializePanelsManager>;
  settingsManager: ReturnType<typeof initializeSettingsManager>;
  unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>;
}) {
  const hasRunMigrations$ = new BehaviorSubject(anyMigrationRun);
  const hasUnsavedChanges$ = new BehaviorSubject(false);
  const lastSavedInput$ = new BehaviorSubject<DashboardState>(lastSavedInput);

  return {
    asyncResetToLastSavedState: async () => {
      panelsManager.internalApi.reset(lastSavedInput$.value);
      settingsManager.internalApi.reset(lastSavedInput$.value);
      unifiedSearchManager.internalApi.reset(lastSavedInput$.value);
      await controlGroupApi$.value?.asyncResetUnsavedChanges();
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
