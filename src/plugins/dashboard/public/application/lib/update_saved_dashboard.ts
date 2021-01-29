/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import type { SavedObjectTagDecoratorTypeGuard } from '../../services/saved_objects_tagging_oss';
import { RefreshInterval, TimefilterContract, esFilters } from '../../services/data';
import { FilterUtils } from './filter_utils';
import { DashboardSavedObject } from '../../saved_dashboards';
import { DashboardAppState } from '../../types';

export function updateSavedDashboard(
  savedDashboard: DashboardSavedObject,
  appState: DashboardAppState,
  timeFilter: TimefilterContract,
  hasTaggingCapabilities: SavedObjectTagDecoratorTypeGuard,
  toJson: <T>(object: T) => string
) {
  savedDashboard.title = appState.title;
  savedDashboard.description = appState.description;
  savedDashboard.timeRestore = appState.timeRestore;
  savedDashboard.panelsJSON = toJson(appState.panels);
  savedDashboard.optionsJSON = toJson(appState.options);

  if (hasTaggingCapabilities(savedDashboard)) {
    savedDashboard.setTags(appState.tags);
  }

  savedDashboard.timeFrom = savedDashboard.timeRestore
    ? FilterUtils.convertTimeToUTCString(timeFilter.getTime().from)
    : undefined;
  savedDashboard.timeTo = savedDashboard.timeRestore
    ? FilterUtils.convertTimeToUTCString(timeFilter.getTime().to)
    : undefined;
  const timeRestoreObj: RefreshInterval = _.pick(timeFilter.getRefreshInterval(), [
    'display',
    'pause',
    'section',
    'value',
  ]) as RefreshInterval;
  savedDashboard.refreshInterval = savedDashboard.timeRestore ? timeRestoreObj : undefined;

  // save only unpinned filters
  const unpinnedFilters = savedDashboard
    .getFilters()
    .filter((filter) => !esFilters.isFilterPinned(filter));
  savedDashboard.searchSource.setField('filter', unpinnedFilters);
}
