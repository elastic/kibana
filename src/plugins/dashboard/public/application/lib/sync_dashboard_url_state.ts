/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { debounceTime } from 'rxjs/operators';

import { migrateAppState } from '.';
import { DashboardSavedObject } from '../..';
import { setDashboardState } from '../state';
import { migrateLegacyQuery } from './migrate_legacy_query';
import { replaceUrlHashQuery } from '../../../../kibana_utils/public';
import { applyDashboardFilterState } from './sync_dashboard_filter_state';
import { DASHBOARD_STATE_STORAGE_KEY } from '../../dashboard_constants';
import type {
  DashboardBuildContext,
  DashboardPanelMap,
  DashboardState,
  RawDashboardState,
} from '../../types';
import { convertSavedPanelsToPanelMap } from './convert_dashboard_panels';

type SyncDashboardUrlStateProps = DashboardBuildContext & { savedDashboard: DashboardSavedObject };

export const syncDashboardUrlState = ({
  dispatchDashboardStateChange,
  getLatestDashboardState,
  query: queryService,
  kbnUrlStateStorage,
  usageCollection,
  savedDashboard,
  kibanaVersion,
}: SyncDashboardUrlStateProps) => {
  /**
   * Loads any dashboard state from the URL, and removes the state from the URL.
   */
  const loadAndRemoveDashboardState = (): Partial<DashboardState> => {
    const rawAppStateInUrl = kbnUrlStateStorage.get<RawDashboardState>(DASHBOARD_STATE_STORAGE_KEY);
    if (!rawAppStateInUrl) return {};

    let panelsMap: DashboardPanelMap = {};
    if (rawAppStateInUrl.panels && rawAppStateInUrl.panels.length > 0) {
      const rawState = migrateAppState(rawAppStateInUrl, kibanaVersion, usageCollection);
      panelsMap = convertSavedPanelsToPanelMap(rawState.panels);
    }

    const migratedQuery = rawAppStateInUrl.query
      ? migrateLegacyQuery(rawAppStateInUrl.query)
      : undefined;

    const nextUrl = replaceUrlHashQuery(window.location.href, (query) => {
      delete query[DASHBOARD_STATE_STORAGE_KEY];
      return query;
    });
    kbnUrlStateStorage.kbnUrlControls.update(nextUrl, true);

    return {
      ..._.omit(rawAppStateInUrl, ['panels', 'query']),
      ...(migratedQuery ? { query: migratedQuery } : {}),
      ...(rawAppStateInUrl.panels ? { panels: panelsMap } : {}),
    };
  };

  // load initial state before subscribing to avoid state removal triggering update.
  const initialDashboardStateFromUrl = loadAndRemoveDashboardState();

  const appStateSubscription = kbnUrlStateStorage
    .change$(DASHBOARD_STATE_STORAGE_KEY)
    .pipe(debounceTime(10)) // debounce URL updates so react has time to unsubscribe when changing URLs
    .subscribe(() => {
      const stateFromUrl = loadAndRemoveDashboardState();

      const updatedDashboardState = { ...getLatestDashboardState(), ...stateFromUrl };
      applyDashboardFilterState({
        currentDashboardState: updatedDashboardState,
        kbnUrlStateStorage,
        queryService,
        savedDashboard,
      });

      if (Object.keys(stateFromUrl).length === 0) return;
      dispatchDashboardStateChange(setDashboardState(updatedDashboardState));
    });

  const stopWatchingAppStateInUrl = () => appStateSubscription.unsubscribe();
  return { initialDashboardStateFromUrl, stopWatchingAppStateInUrl };
};
