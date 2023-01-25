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

import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { replaceUrlHashQuery } from '@kbn/kibana-utils-plugin/common';

import {
  DashboardPanelMap,
  SavedDashboardPanel,
  SharedDashboardState,
  convertSavedPanelsToPanelMap,
  DashboardContainerInput,
} from '../../../common';
import { DashboardAPI } from '../../dashboard_container';
import { pluginServices } from '../../services/plugin_services';
import { getPanelTooOldErrorString } from '../_dashboard_app_strings';
import { DASHBOARD_STATE_STORAGE_KEY } from '../../dashboard_constants';
import { migrateLegacyQuery } from '../../services/dashboard_saved_object/lib/load_dashboard_state_from_saved_object';

/**
 * We no longer support loading panels from a version older than 7.3 in the URL.
 * @returns whether or not there is a panel in the URL state saved with a version before 7.3
 */
export const isPanelVersionTooOld = (panels: SavedDashboardPanel[]) => {
  for (const panel of panels) {
    if (!panel.version || semverSatisfies(panel.version, '<7.3')) return true;
  }
  return false;
};

/**
 * Loads any dashboard state from the URL, and removes the state from the URL.
 */
export const loadAndRemoveDashboardState = (
  kbnUrlStateStorage: IKbnUrlStateStorage
): Partial<DashboardContainerInput> => {
  const {
    notifications: { toasts },
  } = pluginServices.getServices();
  const rawAppStateInUrl = kbnUrlStateStorage.get<SharedDashboardState>(
    DASHBOARD_STATE_STORAGE_KEY
  );
  if (!rawAppStateInUrl) return {};

  let panelsMap: DashboardPanelMap | undefined;
  if (rawAppStateInUrl.panels && rawAppStateInUrl.panels.length > 0) {
    if (isPanelVersionTooOld(rawAppStateInUrl.panels)) {
      toasts.addWarning(getPanelTooOldErrorString());
    } else {
      panelsMap = convertSavedPanelsToPanelMap(rawAppStateInUrl.panels);
    }
  }

  const nextUrl = replaceUrlHashQuery(window.location.href, (hashQuery) => {
    delete hashQuery[DASHBOARD_STATE_STORAGE_KEY];
    return hashQuery;
  });
  kbnUrlStateStorage.kbnUrlControls.update(nextUrl, true);
  const partialState: Partial<DashboardContainerInput> = {
    ..._.omit(rawAppStateInUrl, ['panels', 'query']),
    ...(panelsMap ? { panels: panelsMap } : {}),
    ...(rawAppStateInUrl.query ? { query: migrateLegacyQuery(rawAppStateInUrl.query) } : {}),
  };

  return partialState;
};

export const startSyncingDashboardUrlState = ({
  kbnUrlStateStorage,
  dashboardAPI,
}: {
  kbnUrlStateStorage: IKbnUrlStateStorage;
  dashboardAPI: DashboardAPI;
}) => {
  const appStateSubscription = kbnUrlStateStorage
    .change$(DASHBOARD_STATE_STORAGE_KEY)
    .pipe(debounceTime(10)) // debounce URL updates so react has time to unsubscribe when changing URLs
    .subscribe(() => {
      const stateFromUrl = loadAndRemoveDashboardState(kbnUrlStateStorage);
      if (Object.keys(stateFromUrl).length === 0) return;
      dashboardAPI.updateInput(stateFromUrl);
    });

  const stopWatchingAppStateInUrl = () => appStateSubscription.unsubscribe();
  return { stopWatchingAppStateInUrl };
};
