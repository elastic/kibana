/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { getDashboard60Warning, dashboardLoadingErrorStrings } from '../../dashboard_strings';
import { savedObjectToDashboardState } from './convert_dashboard_state';
import { DashboardState, DashboardBuildContext } from '../../types';
import { DashboardConstants, DashboardSavedObject } from '../..';
import { migrateLegacyQuery } from './migrate_legacy_query';
import { cleanFiltersForSerialize } from './filter_utils';
import { pluginServices } from '../../services/plugin_services';

interface LoadSavedDashboardStateReturn {
  savedDashboardState: DashboardState;
  savedDashboard: DashboardSavedObject;
}

/**
 * Loads, migrates, and returns state from a dashboard saved object.
 */
export const loadSavedDashboardState = async ({
  history,
  savedDashboards,
  savedDashboardId,
}: DashboardBuildContext & { savedDashboardId?: string }): Promise<
  LoadSavedDashboardStateReturn | undefined
> => {
  const {
    dashboardCapabilities: { showWriteControls },
    data: {
      query: { queryString },
    },
    notifications: { toasts },
  } = pluginServices.getServices();

  // BWC - remove for 8.0
  if (savedDashboardId === 'create') {
    history.replace({
      ...history.location, // preserve query,
      pathname: DashboardConstants.CREATE_NEW_DASHBOARD_URL,
    });

    toasts.addWarning(getDashboard60Warning());
    return;
  }
  try {
    const savedDashboard = (await savedDashboards.get({
      id: savedDashboardId,
      useResolve: true,
    })) as DashboardSavedObject;
    const savedDashboardState = savedObjectToDashboardState({
      savedDashboard,
    });

    const isViewMode = !showWriteControls || Boolean(savedDashboard.id);
    savedDashboardState.viewMode = isViewMode ? ViewMode.VIEW : ViewMode.EDIT;
    savedDashboardState.filters = cleanFiltersForSerialize(savedDashboardState.filters);
    savedDashboardState.query = migrateLegacyQuery(
      savedDashboardState.query || queryString.getDefaultQuery()
    );

    return { savedDashboardState, savedDashboard };
  } catch (error) {
    // E.g. a corrupt or deleted dashboard
    toasts.addDanger(dashboardLoadingErrorStrings.getDashboardLoadError(error.message));
    history.push(DashboardConstants.LANDING_PAGE_PATH);
    return;
  }
};
