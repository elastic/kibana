/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StateComparators, WithAllKeys } from '@kbn/presentation-publishing';
import { diffComparators, initializeStateManager } from '@kbn/presentation-publishing';
import type { BehaviorSubject } from 'rxjs';
import { combineLatestWith, debounceTime, map } from 'rxjs';
import type { DashboardState } from '../../common';
import type { DashboardAttributes, DashboardOptions } from '../../server/content_management';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../common/content_management';

export type DashboardSettings = Required<DashboardOptions> & {
  description?: DashboardAttributes['description'];
  tags: DashboardAttributes['tags'];
  timeRestore: DashboardAttributes['timeRestore'];
  title: DashboardAttributes['description'];
};

const DEFAULT_SETTINGS: WithAllKeys<DashboardSettings> = {
  ...DEFAULT_DASHBOARD_OPTIONS,
  description: undefined,
  tags: [],
  timeRestore: false,
  title: '',
};

const comparators: StateComparators<DashboardSettings> = {
  title: 'referenceEquality',
  description: 'referenceEquality',
  hidePanelTitles: 'referenceEquality',
  syncColors: 'referenceEquality',
  syncCursor: 'referenceEquality',
  syncTooltips: 'referenceEquality',
  timeRestore: 'referenceEquality',
  useMargins: 'referenceEquality',
  tags: 'deepEquality',
};

function deserializeState(state: DashboardState) {
  return {
    ...state.options,
    description: state.description,
    tags: state.tags,
    timeRestore: state.timeRestore,
    title: state.title,
  };
}

export function initializeSettingsManager(initialState: DashboardState) {
  const stateManager = initializeStateManager(
    deserializeState(initialState),
    DEFAULT_SETTINGS,
    comparators
  );

  function serializeSettings() {
    const { description, tags, timeRestore, title, ...options } = stateManager.getLatestState();
    return {
      ...(description && { description }),
      tags,
      timeRestore,
      title: title ?? '',
      options,
    };
  }

  return {
    api: {
      description$: stateManager.api.description$,
      getSettings: stateManager.getLatestState,
      settings: {
        syncColors$: stateManager.api.syncColors$,
        syncCursor$: stateManager.api.syncCursor$,
        syncTooltips$: stateManager.api.syncTooltips$,
        useMargins$: stateManager.api.useMargins$,
      },
      setSettings: stateManager.reinitializeState,
      setTags: stateManager.api.setTags,
      timeRestore$: stateManager.api.timeRestore$,
      title$: stateManager.api.title$,
    },
    internalApi: {
      serializeSettings: () => {
        const { description, tags, timeRestore, title, ...options } = stateManager.getLatestState();
        return {
          ...(description && { description }),
          tags,
          timeRestore,
          title: title ?? '',
          options,
        };
      },
      startComparing$: (lastSavedState$: BehaviorSubject<DashboardState>) => {
        return stateManager.anyStateChange$.pipe(
          debounceTime(100),
          map(() => stateManager.getLatestState()),
          combineLatestWith(lastSavedState$),
          map(([latestState, lastSavedState]) => {
            const { description, tags, timeRestore, title, ...optionDiffs } = diffComparators(
              comparators,
              deserializeState(lastSavedState),
              latestState,
              DEFAULT_SETTINGS
            );
            const options = Object.keys(optionDiffs).length
              ? { ...serializeSettings().options, ...optionDiffs }
              : undefined;
            return {
              ...(description && { description }),
              ...(tags && { tags }),
              ...(timeRestore && { timeRestore }),
              ...(title && { title }),
              ...(options && { options }),
            };
          })
        );
      },
      reset: (lastSavedState: DashboardState) => {
        stateManager.reinitializeState(deserializeState(lastSavedState));
      },
    },
  };
}
