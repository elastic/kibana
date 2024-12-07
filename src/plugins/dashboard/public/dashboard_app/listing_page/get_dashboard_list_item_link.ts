/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStateFromKbnUrl, setStateToKbnUrl, unhashUrl } from '@kbn/kibana-utils-plugin/public';
import { QueryState } from '@kbn/data-plugin/common';
import { DashboardPanelMap, convertPanelMapToSavedPanels } from '../../../common';
import {
  DASHBOARD_STATE_SESSION_KEY,
  PANELS_CONTROL_GROUP_KEY,
  getDashboardBackupService,
} from '../../services/dashboard_backup_service';
import { DashboardLocatorParams } from '../../dashboard_container';
import { DASHBOARD_APP_ID, createDashboardEditUrl } from '../../dashboard_constants';
import { coreServices } from '../../services/kibana_services';

interface SessionStorageDashboardStates {
  [spaceId: string]: {
    [dashboardId: string]: {
      panels: DashboardPanelMap;
    };
  };
}

export const getDashboardListItemLink = (
  id: string,
  timeRestore: boolean,
  spaceId?: string,
  includeBasepath: boolean = false
) => {
  let unsavedStateForLocator: DashboardLocatorParams = {};

  const { dashboardState: unsavedDashboardState, panels: panelModifications } =
    getDashboardBackupService().getState(id) ?? {};

  const allUnsavedPanels = (() => {
    if (
      Object.keys(unsavedDashboardState?.panels ?? {}).length === 0 &&
      Object.keys(panelModifications ?? {}).length === 0
    ) {
      // if this dashboard has no modifications or unsaved panels return early. No overrides needed.
      return;
    }

    const sessionDashboard: SessionStorageDashboardStates = JSON.parse(
      sessionStorage.getItem(DASHBOARD_STATE_SESSION_KEY) || '{}'
    );

    // format unsaved changes in session storage vs the share url which pulls it from the dashboard api
    let latestPanels: DashboardPanelMap | undefined;

    Object.entries(sessionDashboard).map((value) => {
      const [unsavedSpaceId, dashboardUnsavedInfo] = value;
      if (unsavedSpaceId === spaceId) {
        return Object.entries(dashboardUnsavedInfo).map(([dashboardId, unsavedDashboardInfo]) => {
          if (dashboardId === id && unsavedDashboardInfo.panels) {
            return Object.entries(unsavedDashboardInfo).map(([panelId, panels]) => {
              if (panelId === 'panels') {
                return (latestPanels = panels);
              }
            });
          }
        });
      }
    });
    const modifiedPanels = panelModifications
      ? Object.entries(panelModifications).reduce((acc, [panelId, unsavedPanel]) => {
          if (unsavedPanel && latestPanels?.[panelId]) {
            acc[panelId] = {
              ...latestPanels[panelId],
              explicitInput: {
                ...latestPanels?.[panelId].explicitInput,
                ...unsavedPanel,
                id: panelId,
              },
            };
          }
          return acc;
        }, {} as DashboardPanelMap)
      : {};

    const allUnsavedPanelsMap = {
      ...latestPanels,
      ...modifiedPanels,
    };

    return convertPanelMapToSavedPanels(allUnsavedPanelsMap);
  })();

  if (unsavedDashboardState) {
    unsavedStateForLocator = {
      query: unsavedDashboardState.query,
      filters: unsavedDashboardState.filters,
      controlGroupState: panelModifications?.[
        PANELS_CONTROL_GROUP_KEY
      ] as DashboardLocatorParams['controlGroupState'],
      panels: allUnsavedPanels as DashboardLocatorParams['panels'],

      // options
      useMargins: unsavedDashboardState?.useMargins,
      syncColors: unsavedDashboardState?.syncColors,
      syncCursor: unsavedDashboardState?.syncCursor,
      syncTooltips: unsavedDashboardState?.syncTooltips,
      hidePanelTitles: unsavedDashboardState?.hidePanelTitles,
    };
  }
  const url = coreServices.application.getUrlForApp(DASHBOARD_APP_ID, {
    path: `#${createDashboardEditUrl(id)}`,
    absolute: includeBasepath,
  });
  const globalStateInUrl = getStateFromKbnUrl<QueryState>('_g', url);

  if (timeRestore) {
    delete globalStateInUrl?.time;
    delete globalStateInUrl?.refreshInterval;
  }

  const baseUrl = setStateToKbnUrl('_g', globalStateInUrl, undefined, url);

  const shareableUrl = setStateToKbnUrl(
    '_a',
    unsavedStateForLocator,
    { useHash: false, storeInHashQuery: true },
    unhashUrl(baseUrl)
  );

  return shareableUrl;
};
