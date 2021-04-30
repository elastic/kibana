/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

import { getDashboard60Warning } from '../../dashboard_strings';
import { DashboardConstants, DashboardSavedObject } from '../..';
import { DashboardBuildContext, DashboardState } from '../../types';
import { savedObjectToDashboardState } from './convert_dashboard_state';
import { ViewMode } from '../../services/embeddable';
import { cleanFiltersForSerialize } from './filter_utils';
import { migrateLegacyQuery } from './migrate_legacy_query';

interface LoadSavedDashboardStateReturn {
  savedDashboardState: DashboardState;
  savedDashboard: DashboardSavedObject;
}

/**
 * Loads, migrates, and returns state from a dashboard saved object.
 */
export const loadSavedDashboardState = async ({
  history,
  services,
  savedDashboardId,
}: DashboardBuildContext): Promise<LoadSavedDashboardStateReturn | undefined> => {
  const {
    indexPatterns,
    savedDashboards,
    usageCollection,
    initializerContext,
    savedObjectsTagging,
    core: { notifications },
    dashboardCapabilities: { hideWriteControls },
    data: {
      query: { queryString },
    },
  } = services;

  // BWC - remove for 8.0
  if (savedDashboardId === 'create') {
    history.replace({
      ...history.location, // preserve query,
      pathname: DashboardConstants.CREATE_NEW_DASHBOARD_URL,
    });

    notifications.toasts.addWarning(getDashboard60Warning());
    return;
  }
  await indexPatterns.ensureDefaultIndexPattern();
  let savedDashboard: DashboardSavedObject | undefined;
  try {
    savedDashboard = (await savedDashboards.get(savedDashboardId)) as DashboardSavedObject;
  } catch (error) {
    // E.g. a corrupt or deleted dashboard
    notifications.toasts.addDanger(error.message);
    history.push(DashboardConstants.LANDING_PAGE_PATH);
    return;
  }
  if (!savedDashboard) return;

  const savedDashboardState = savedObjectToDashboardState({
    savedDashboard,
    usageCollection,
    hideWriteControls,
    savedObjectsTagging,
    version: initializerContext.env.packageInfo.version,
  });

  const isViewMode = hideWriteControls || Boolean(savedDashboard.id);
  savedDashboardState.viewMode = isViewMode ? ViewMode.VIEW : ViewMode.EDIT;
  savedDashboardState.filters = cleanFiltersForSerialize(savedDashboardState.filters);
  savedDashboardState.query = migrateLegacyQuery(
    savedDashboardState.query || queryString.getDefaultQuery()
  );

  return { savedDashboardState, savedDashboard };
};
