/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fastIsEqual from 'fast-deep-equal';
import {
  StateComparators,
  diffComparators,
  initializeTitleManager,
} from '@kbn/presentation-publishing';
import { BehaviorSubject, combineLatest, combineLatestWith, debounceTime, map } from 'rxjs';
import { DashboardSettings, DashboardState } from './types';
import { DEFAULT_DASHBOARD_STATE } from './default_dashboard_state';

// SERIALIZED STATE ONLY TODO: Use src/platform/packages/shared/presentation/presentation_publishing/state_manager/state_manager.ts in here
export function initializeSettingsManager(initialState?: DashboardState) {
  const syncColors$ = new BehaviorSubject<boolean>(
    initialState?.syncColors ?? DEFAULT_DASHBOARD_STATE.syncColors
  );
  function setSyncColors(syncColors: boolean) {
    if (syncColors !== syncColors$.value) syncColors$.next(syncColors);
  }
  const syncCursor$ = new BehaviorSubject<boolean>(
    initialState?.syncCursor ?? DEFAULT_DASHBOARD_STATE.syncCursor
  );
  function setSyncCursor(syncCursor: boolean) {
    if (syncCursor !== syncCursor$.value) syncCursor$.next(syncCursor);
  }
  const syncTooltips$ = new BehaviorSubject<boolean>(
    initialState?.syncTooltips ?? DEFAULT_DASHBOARD_STATE.syncTooltips
  );
  function setSyncTooltips(syncTooltips: boolean) {
    if (syncTooltips !== syncTooltips$.value) syncTooltips$.next(syncTooltips);
  }
  const tags$ = new BehaviorSubject<string[]>(initialState?.tags ?? DEFAULT_DASHBOARD_STATE.tags);
  function setTags(tags: string[]) {
    if (!fastIsEqual(tags, tags$.value)) tags$.next(tags);
  }
  const titleManager = initializeTitleManager(initialState ?? {});
  const timeRestore$ = new BehaviorSubject<boolean | undefined>(
    initialState?.timeRestore ?? DEFAULT_DASHBOARD_STATE.timeRestore
  );
  function setTimeRestore(timeRestore: boolean) {
    if (timeRestore !== timeRestore$.value) timeRestore$.next(timeRestore);
  }
  const useMargins$ = new BehaviorSubject<boolean>(
    initialState?.useMargins ?? DEFAULT_DASHBOARD_STATE.useMargins
  );
  function setUseMargins(useMargins: boolean) {
    if (useMargins !== useMargins$.value) useMargins$.next(useMargins);
  }

  function getSettings() {
    return {
      ...titleManager.serialize(),
      syncColors: syncColors$.value,
      syncCursor: syncCursor$.value,
      syncTooltips: syncTooltips$.value,
      tags: tags$.value,
      timeRestore: timeRestore$.value ?? false,
      useMargins: useMargins$.value,
    };
  }

  function setSettings(settings: DashboardSettings) {
    setSyncColors(settings.syncColors);
    setSyncCursor(settings.syncCursor);
    setSyncTooltips(settings.syncTooltips);
    setTags(settings.tags);
    setTimeRestore(settings.timeRestore);
    setUseMargins(settings.useMargins);
    titleManager.api.setHideTitle(settings.hidePanelTitles);
    titleManager.api.setDescription(settings.description);
    titleManager.api.setTitle(settings.title);
  }

  const comparators: StateComparators<DashboardSettings> = {
    ...titleManager.comparators,
    syncColors: 'referenceEquality',
    syncCursor: 'referenceEquality',
    syncTooltips: 'referenceEquality',
    timeRestore: 'referenceEquality',
    useMargins: 'referenceEquality',
    tags: 'deepEquality',
  };

  const getState = (): DashboardSettings => {
    const settings = getSettings();
    return {
      ...settings,
      title: settings.title ?? '',
      timeRestore: settings.timeRestore ?? DEFAULT_DASHBOARD_STATE.timeRestore,
      hidePanelTitles: settings.hidePanelTitles ?? DEFAULT_DASHBOARD_STATE.hidePanelTitles,
    };
  };

  return {
    api: {
      ...titleManager.api,
      getSettings,
      settings: {
        syncColors$,
        syncCursor$,
        syncTooltips$,
        useMargins$,
      },
      setSettings,
      setTags,
      timeRestore$,
    },
    internalApi: {
      startComparing$: (lastSavedState$: BehaviorSubject<DashboardState>) => {
        return combineLatest([
          syncColors$,
          syncCursor$,
          syncTooltips$,
          tags$,
          timeRestore$,
          useMargins$,

          // SERIALIZED STATE ONLY TODO: titlemanager should have a latestState$ observable
          titleManager.api.title$,
          titleManager.api.description$,
          titleManager.api.hideTitle$,
        ]).pipe(
          debounceTime(100),
          map(() => getState()),
          combineLatestWith(lastSavedState$),
          map(([latestState, lastSavedState]) =>
            diffComparators(comparators, lastSavedState, latestState)
          )
        );
      },
      getState,
      reset: (lastSavedState: DashboardState) => {
        setSettings(lastSavedState);
      },
    },
  };
}
