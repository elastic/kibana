/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

import { QueryState } from '../../services/data';
import { getDashboard60Warning } from '../../dashboard_strings';
import { DashboardConstants, DashboardSavedObject } from '../..';
import { DashboardBuildContext, DashboardState } from '../../types';
import { savedObjectToDashboardState } from './convert_dashboard_state';
import { ViewMode } from '../../services/embeddable';
import { cleanFiltersForSerialize } from './filter_utils';

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
  kbnUrlStateStorage,
}: DashboardBuildContext): Promise<LoadSavedDashboardStateReturn | undefined> => {
  const {
    indexPatterns,
    savedDashboards,
    usageCollection,
    data: { query },
    initializerContext,
    savedObjectsTagging,
    core: { notifications },
    dashboardCapabilities: { hideWriteControls },
  } = services;
  const { filterManager, queryString, timefilter: timeFilterService } = query;
  const { timefilter } = timeFilterService;

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

  // apply initial filters
  const initialFilters = _.cloneDeep(savedDashboardState.filters);
  filterManager.setAppFilters(initialFilters);
  savedDashboard.searchSource.setField('filter', initialFilters);

  // apply initial query
  const initialQuery = savedDashboardState.query || queryString.getDefaultQuery();
  queryString.setQuery(initialQuery);
  savedDashboardState.query = initialQuery;
  savedDashboard.searchSource.setField('query', initialQuery);

  // apply initial timepicker & refresh interval if global state is not provided
  if (savedDashboardState.timeRestore) {
    const initialGlobalStateInUrl = kbnUrlStateStorage.get<QueryState>('_g');
    if (!initialGlobalStateInUrl?.time) {
      if (savedDashboard.timeFrom && savedDashboard.timeTo) {
        timefilter.setTime({
          from: savedDashboard.timeFrom,
          to: savedDashboard.timeTo,
        });
      }
    }
    if (!initialGlobalStateInUrl?.refreshInterval) {
      if (savedDashboard.refreshInterval) {
        timefilter.setRefreshInterval(savedDashboard.refreshInterval);
      }
    }
  }

  const isViewMode = hideWriteControls || Boolean(savedDashboard.id);
  savedDashboardState.viewMode = isViewMode ? ViewMode.VIEW : ViewMode.EDIT;

  savedDashboardState.filters = cleanFiltersForSerialize(savedDashboardState.filters);

  return { savedDashboardState, savedDashboard };
};
