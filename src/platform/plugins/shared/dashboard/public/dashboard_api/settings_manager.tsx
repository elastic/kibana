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
import type { DashboardState, DashboardOptions } from '../../server';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../common/constants';

export type DashboardSettings = Required<DashboardOptions> & {
  description?: DashboardState['description'];
  tags: DashboardState['tags'];
  time_restore: boolean;
  title: DashboardState['title'];
};

const DEFAULT_SETTINGS: WithAllKeys<DashboardSettings> = {
  ...DEFAULT_DASHBOARD_OPTIONS,
  description: undefined,
  tags: [],
  time_restore: false,
  title: '',
};

const comparators: StateComparators<DashboardSettings> = {
  title: 'referenceEquality',
  description: 'referenceEquality',
  hide_panel_titles: 'referenceEquality',
  sync_colors: 'referenceEquality',
  sync_cursor: 'referenceEquality',
  sync_tooltips: 'referenceEquality',
  time_restore: 'referenceEquality',
  use_margins: 'referenceEquality',
  tags: 'deepEquality',
};

function deserializeState(state: DashboardState) {
  return {
    ...state.options,
    description: state.description,
    tags: state.tags,
    time_restore: Boolean(state.time_range),
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
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { description, tags, time_restore, title, ...options } = stateManager.getLatestState();
    return {
      ...(description && { description }),
      tags,
      title,
      options,
    };
  }

  return {
    api: {
      setTags: stateManager.api.setTags,
      getSettings: stateManager.getLatestState,
      setSettings: stateManager.reinitializeState,
      title$: stateManager.api.title$,
      description$: stateManager.api.description$,
      timeRestore$: stateManager.api.time_restore$,
      hideTitle$: stateManager.api.hide_panel_titles$,
      settings: {
        syncColors$: stateManager.api.sync_colors$,
        syncCursor$: stateManager.api.sync_cursor$,
        syncTooltips$: stateManager.api.sync_tooltips$,
        useMargins$: stateManager.api.use_margins$,
      },
    },
    internalApi: {
      serializeSettings,
      startComparing$: (lastSavedState$: BehaviorSubject<DashboardState>) => {
        return stateManager.anyStateChange$.pipe(
          debounceTime(100),
          map(() => stateManager.getLatestState()),
          combineLatestWith(lastSavedState$),
          map(([latestState, lastSavedState]) => {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { description, tags, time_restore, title, ...optionDiffs } = diffComparators(
              comparators,
              deserializeState(lastSavedState),
              latestState,
              DEFAULT_SETTINGS
            );
            // options needs to contain all values and not just diffs since is spread into saved state
            const options = Object.keys(optionDiffs).length
              ? { ...serializeSettings().options, ...optionDiffs }
              : undefined;
            return {
              ...(description && { description }),
              ...(tags && { tags }),
              ...(title && { title }),
              ...(typeof time_restore === 'boolean' && { time_restore }),
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
