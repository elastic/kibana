/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StateComparators } from '@kbn/presentation-publishing';
import {
  diffComparators,
  initializeTitleManager,
  titleComparators,
} from '@kbn/presentation-publishing';
import type { Writable } from '@kbn/utility-types';
import fastIsEqual from 'fast-deep-equal';
import { BehaviorSubject, combineLatest, combineLatestWith, debounceTime, map } from 'rxjs';
import type { DashboardState } from '../../common';
import { DEFAULT_DASHBOARD_STATE } from './default_dashboard_state';
import type { DashboardAttributes, DashboardOptions } from '../../server/content_management';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../common/content_management';

export type DashboardSettings = Writable<Required<DashboardOptions>> & {
  description?: DashboardAttributes['description'];
  tags: string[];
  timeRestore: DashboardAttributes['timeRestore'];
  title: DashboardAttributes['description'];
};

// SERIALIZED STATE ONLY TODO: This could be simplified by using src/platform/packages/shared/presentation/presentation_publishing/state_manager/state_manager.ts
export function initializeSettingsManager(initialState?: DashboardState) {
  const syncColors$ = new BehaviorSubject<boolean>(
    initialState?.options?.syncColors ?? DEFAULT_DASHBOARD_OPTIONS.syncColors
  );
  function setSyncColors(syncColors: boolean) {
    if (syncColors !== syncColors$.value) syncColors$.next(syncColors);
  }
  const syncCursor$ = new BehaviorSubject<boolean>(
    initialState?.options?.syncCursor ?? DEFAULT_DASHBOARD_OPTIONS.syncCursor
  );
  function setSyncCursor(syncCursor: boolean) {
    if (syncCursor !== syncCursor$.value) syncCursor$.next(syncCursor);
  }
  const syncTooltips$ = new BehaviorSubject<boolean>(
    initialState?.options?.syncTooltips ?? DEFAULT_DASHBOARD_OPTIONS.syncTooltips
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
    initialState?.options?.useMargins ?? DEFAULT_DASHBOARD_OPTIONS.useMargins
  );
  function setUseMargins(useMargins: boolean) {
    if (useMargins !== useMargins$.value) useMargins$.next(useMargins);
  }

  function getSettings(): DashboardSettings {
    const titleState = titleManager.getLatestState();
    return {
      title: titleState.title ?? '',
      description: titleState.description,
      hidePanelTitles: titleState.hidePanelTitles ?? DEFAULT_DASHBOARD_OPTIONS.hidePanelTitles,
      syncColors: syncColors$.value,
      syncCursor: syncCursor$.value,
      syncTooltips: syncTooltips$.value,
      tags: tags$.value,
      timeRestore: timeRestore$.value ?? DEFAULT_DASHBOARD_STATE.timeRestore,
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

  function getSettingsFromLastSavedState(lastSavedState: DashboardState) {
    return {
      ...DEFAULT_DASHBOARD_OPTIONS,
      ...lastSavedState?.options,
      description: lastSavedState.description,
      tags: lastSavedState.tags,
      timeRestore: lastSavedState.timeRestore,
      title: lastSavedState.title,
    };
  }

  const comparators: StateComparators<DashboardSettings> = {
    title: titleComparators.title,
    description: titleComparators.description,
    hidePanelTitles: 'referenceEquality',
    syncColors: 'referenceEquality',
    syncCursor: 'referenceEquality',
    syncTooltips: 'referenceEquality',
    timeRestore: 'referenceEquality',
    useMargins: 'referenceEquality',
    tags: 'deepEquality',
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
      serializeSettings: () => {
        const { description, tags, timeRestore, title, ...options } = getSettings();
        return {
          description,
          tags,
          timeRestore,
          title,
          options,
        };
      },
      startComparing$: (lastSavedState$: BehaviorSubject<DashboardState>) => {
        return combineLatest([
          syncColors$,
          syncCursor$,
          syncTooltips$,
          tags$,
          timeRestore$,
          useMargins$,
          titleManager.anyStateChange$,
        ]).pipe(
          debounceTime(100),
          map(() => getSettings()),
          combineLatestWith(lastSavedState$),
          map(([latestState, lastSavedState]) =>
            diffComparators(comparators, getSettingsFromLastSavedState(lastSavedState), latestState)
          )
        );
      },
      reset: (lastSavedState: DashboardState) => {
        setSettings(getSettingsFromLastSavedState(lastSavedState));
      },
    },
  };
}
