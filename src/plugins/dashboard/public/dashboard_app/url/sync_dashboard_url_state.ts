/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { debounceTime } from 'rxjs';
import semverSatisfies from 'semver/functions/satisfies';

import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { replaceUrlHashQuery } from '@kbn/kibana-utils-plugin/common';

import {
  DashboardPanelMap,
  SharedDashboardState,
  convertSavedPanelsToPanelMap,
  DashboardContainerInput,
} from '../../../common';
import { DashboardAPI } from '../../dashboard_container';
import { pluginServices } from '../../services/plugin_services';
import { getPanelTooOldErrorString } from '../_dashboard_app_strings';
import { DASHBOARD_STATE_STORAGE_KEY } from '../../dashboard_constants';
import { SavedDashboardPanel } from '../../../common/content_management';
import { migrateLegacyQuery } from '../../services/dashboard_content_management/lib/load_dashboard_state';

/**
 * We no longer support loading panels from a version older than 7.3 in the URL.
 * @returns whether or not there is a panel in the URL state saved with a version before 7.3
 */
export const isPanelVersionTooOld = (panels: SavedDashboardPanel[]) => {
  for (const panel of panels) {
    if (
      !panel.gridData ||
      !panel.embeddableConfig ||
      (panel.version && semverSatisfies(panel.version, '<7.3'))
    )
      return true;
  }
  return false;
};

function getPanelsMap(appStateInUrl: SharedDashboardState): DashboardPanelMap | undefined {
  if (!appStateInUrl.panels) {
    return undefined;
  }

  if (appStateInUrl.panels.length === 0) {
    return {};
  }

  if (isPanelVersionTooOld(appStateInUrl.panels)) {
    pluginServices.getServices().notifications.toasts.addWarning(getPanelTooOldErrorString());
    return undefined;
  }

  return convertSavedPanelsToPanelMap(appStateInUrl.panels);
}

const redirectForExpandedPanels = (
  kbnUrlStateStorage: IKbnUrlStateStorage,
  stateFromUrl: SharedDashboardState,
  dashboardAPI: DashboardAPI
) => {
  const nextUrl = replaceUrlHashQuery(window.location.href, (hashQuery) => {
    hashQuery[DASHBOARD_STATE_STORAGE_KEY] = `(expandedPanelId:'${stateFromUrl?.expandedPanelId}')`;
    return hashQuery;
  });
  kbnUrlStateStorage.kbnUrlControls.update(nextUrl, true);
  return dashboardAPI.setExpandedPanelId(stateFromUrl.expandedPanelId);
};

/**
 * Loads any dashboard state from the URL, and removes the state from the URL.
 */
export const loadAndRemoveDashboardState = (
  kbnUrlStateStorage: IKbnUrlStateStorage,
  dashboardAPI: DashboardAPI
): Partial<DashboardContainerInput> => {
  let stateFromUrl;
  if (kbnUrlStateStorage.get<SharedDashboardState>(DASHBOARD_STATE_STORAGE_KEY) !== null) {
    stateFromUrl = kbnUrlStateStorage.get<SharedDashboardState>(DASHBOARD_STATE_STORAGE_KEY);
  }
  if (!stateFromUrl) return {};
  if (stateFromUrl?.expandedPanelId) {
    redirectForExpandedPanels(kbnUrlStateStorage, stateFromUrl, dashboardAPI);
  }
  const panelsMap = getPanelsMap(stateFromUrl);

  const nextUrl = replaceUrlHashQuery(window.location.href, (hashQuery) => {
    delete hashQuery[DASHBOARD_STATE_STORAGE_KEY];
    return hashQuery;
  });
  kbnUrlStateStorage.kbnUrlControls.update(nextUrl, true);
  const partialState: Partial<DashboardContainerInput> = {
    ..._.omit(stateFromUrl, ['panels', 'query', 'expandedPanelId']),
    ...(panelsMap ? { panels: panelsMap } : {}),
    ...(stateFromUrl.query ? { query: migrateLegacyQuery(stateFromUrl.query) } : {}),
    ...(stateFromUrl.expandedPanelId ? { expandedPanelId: stateFromUrl.expandedPanelId } : {}),
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
      const stateFromUrl = loadAndRemoveDashboardState(kbnUrlStateStorage, dashboardAPI);
      if (Object.keys(stateFromUrl).length === 0) return;
      else if (Object.keys(stateFromUrl).includes('expandedPanelId')) {
        kbnUrlStateStorage.set(DASHBOARD_STATE_STORAGE_KEY, {
          expandedPanelId: stateFromUrl.expandedPanelId,
        });
        dashboardAPI.updateInput({ expandedPanelId: stateFromUrl.expandedPanelId });
        return dashboardAPI.setExpandedPanelId(stateFromUrl.expandedPanelId);
      }
      dashboardAPI.updateInput(stateFromUrl);
    });

  const stopWatchingAppStateInUrl = () => appStateSubscription.unsubscribe();
  return { stopWatchingAppStateInUrl };
};
