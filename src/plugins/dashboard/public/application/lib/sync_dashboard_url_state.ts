/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { debounceTime } from 'rxjs/operators';
import semverSatisfies from 'semver/functions/satisfies';

import { replaceUrlHashQuery } from '@kbn/kibana-utils-plugin/public';

import { setDashboardState } from '../state';
import { migrateLegacyQuery } from './migrate_legacy_query';
import { pluginServices } from '../../services/plugin_services';
import { DASHBOARD_STATE_STORAGE_KEY } from '../../dashboard_constants';
import { applyDashboardFilterState } from './sync_dashboard_filter_state';
import { dashboardSavedObjectErrorStrings } from '../../dashboard_strings';
import { convertSavedPanelsToPanelMap, DashboardPanelMap } from '../../../common';
import type { DashboardBuildContext, DashboardState, RawDashboardState } from '../../types';

/**
 * We no longer support loading panels from a version older than 7.3 in the URL.
 * @returns whether or not there is a panel in the URL state saved with a version before 7.3
 */
export const isPanelVersionTooOld = (panels: RawDashboardState['panels']) => {
  for (const panel of panels) {
    if (!panel.version || semverSatisfies(panel.version, '<7.3')) return true;
  }
  return false;
};

export const syncDashboardUrlState = ({
  dispatchDashboardStateChange,
  getLatestDashboardState,
  kbnUrlStateStorage,
}: DashboardBuildContext) => {
  /**
   * Loads any dashboard state from the URL, and removes the state from the URL.
   */
  const loadAndRemoveDashboardState = (): Partial<DashboardState> => {
    const {
      notifications: { toasts },
    } = pluginServices.getServices();
    const rawAppStateInUrl = kbnUrlStateStorage.get<RawDashboardState>(DASHBOARD_STATE_STORAGE_KEY);
    if (!rawAppStateInUrl) return {};

    let panelsMap: DashboardPanelMap | undefined;
    if (rawAppStateInUrl.panels && rawAppStateInUrl.panels.length > 0) {
      if (isPanelVersionTooOld(rawAppStateInUrl.panels)) {
        toasts.addWarning(dashboardSavedObjectErrorStrings.getPanelTooOldError());
      } else {
        panelsMap = convertSavedPanelsToPanelMap(rawAppStateInUrl.panels);
      }
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
      ...(panelsMap ? { panels: panelsMap } : {}),
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
      });

      if (Object.keys(stateFromUrl).length === 0) return;
      dispatchDashboardStateChange(setDashboardState(updatedDashboardState));
    });

  const stopWatchingAppStateInUrl = () => appStateSubscription.unsubscribe();
  return { initialDashboardStateFromUrl, stopWatchingAppStateInUrl };
};
