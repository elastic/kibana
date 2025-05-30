/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { replaceUrlHashQuery } from '@kbn/kibana-utils-plugin/common';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { History } from 'history';
import { skip } from 'rxjs';
import semverSatisfies from 'semver/functions/satisfies';
import type { DashboardState } from '../../../common/types';
import { DashboardApi } from '../../dashboard_api/types';
import { coreServices } from '../../services/kibana_services';
import { DASHBOARD_STATE_STORAGE_KEY, createDashboardEditUrl } from '../../utils/urls';
import { getPanelTooOldErrorString } from '../_dashboard_app_strings';
import { extractDashboardState } from './bwc/extract_dashboard_state';

/**
 * We no longer support loading panels from a version older than 7.3 in the URL.
 * @returns whether or not there is a panel in the URL state saved with a version before 7.3
 */
export const isPanelVersionTooOld = (panels: unknown[]) => {
  for (const panel of panels) {
    if (!panel || typeof panel !== 'object') {
      continue;
    }

    const panelAsObject = panel as { [key: string]: unknown };

    if ('panels' in panel) {
      continue; // ignore sections
    }

    if (
      !panelAsObject.gridData ||
      !(panelAsObject.panelConfig || panelAsObject.embeddableConfig) ||
      (panelAsObject.version && semverSatisfies(panelAsObject.version as string, '<7.3'))
    )
      return true;
  }
  return false;
};

/**
 * Loads any dashboard state from the URL, and removes the state from the URL.
 */
export const loadAndRemoveDashboardState = (
  kbnUrlStateStorage: IKbnUrlStateStorage
): Partial<DashboardState> => {
  const rawAppStateInUrl = kbnUrlStateStorage.get<unknown>(DASHBOARD_STATE_STORAGE_KEY);

  if (!rawAppStateInUrl) return {};

  // clear application state from URL
  const nextUrl = replaceUrlHashQuery(window.location.href, (hashQuery) => {
    delete hashQuery[DASHBOARD_STATE_STORAGE_KEY];
    return hashQuery;
  });
  kbnUrlStateStorage.kbnUrlControls.update(nextUrl, true);

  const panels =
    typeof rawAppStateInUrl === 'object' &&
    'panels' in rawAppStateInUrl &&
    Array.isArray(rawAppStateInUrl.panels)
      ? rawAppStateInUrl.panels
      : [];
  if (isPanelVersionTooOld(panels)) {
    coreServices.notifications.toasts.addWarning(getPanelTooOldErrorString());
  }

  return extractDashboardState(rawAppStateInUrl);
};

export const startSyncingExpandedPanelState = ({
  dashboardApi,
  history,
}: {
  dashboardApi: DashboardApi;
  history: History;
}) => {
  const expandedPanelSubscription = dashboardApi?.expandedPanelId$
    // skip the first value because we don't want to trigger a history.replace on initial load
    .pipe(skip(1))
    .subscribe((expandedPanelId) => {
      history.replace({
        ...history.location,
        pathname: `${createDashboardEditUrl(dashboardApi.savedObjectId$.value)}${
          Boolean(expandedPanelId) ? `/${expandedPanelId}` : ''
        }`,
      });
    });
  const stopWatchingExpandedPanel = () => expandedPanelSubscription.unsubscribe();
  return { stopWatchingExpandedPanel };
};
