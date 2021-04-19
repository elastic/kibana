/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { DashboardAppServices, DashboardRedirect, DashboardState } from '../../types';
import { DashboardSavedObject } from '../../saved_dashboards';
import { SavedObjectSaveOpts } from '../../services/saved_objects';
import { getHasTaggingCapabilitiesGuard } from './dashboard_tagging';
import { SavedObjectsTaggingApi } from '../../services/saved_objects_tagging_oss';
import { RefreshInterval, TimefilterContract, esFilters } from '../../services/data';
import type { SavedObjectTagDecoratorTypeGuard } from '../../services/saved_objects_tagging_oss';
import { NotificationsStart } from '../../services/core';
import { dashboardSaveToastStrings } from '../../dashboard_strings';
import { convertTimeToUTCString } from '.';

export type SavedDashboardSaveOpts = SavedObjectSaveOpts & { stayInEditMode?: boolean };

interface SaveDashboardProps {
  redirectTo: DashboardRedirect;
  currentState: DashboardState;
  timefilter: TimefilterContract;
  saveOptions: SavedDashboardSaveOpts;
  toasts: NotificationsStart['toasts'];
  savedDashboard: DashboardSavedObject;
  savedObjectsTagging?: SavedObjectsTaggingApi;
}

export const saveDashboard = async ({
  redirectTo,
  currentState,
  timefilter,
  saveOptions,
  toasts,
  savedDashboard,
  savedObjectsTagging,
}: SaveDashboardProps): Promise<{ id?: string; redirected?: boolean; error?: any }> => {
  const lastDashboardId = savedDashboard.id;
  const hasTaggingCapabilities = getHasTaggingCapabilitiesGuard(savedObjectsTagging);

  savedDashboard.title = currentState.title;
  savedDashboard.description = currentState.description;
  savedDashboard.timeRestore = currentState.timeRestore;
  savedDashboard.panelsJSON = JSON.stringify(currentState.panels);
  savedDashboard.optionsJSON = JSON.stringify(currentState.options);

  if (hasTaggingCapabilities(savedDashboard)) {
    savedDashboard.setTags(currentState.tags);
  }

  savedDashboard.timeFrom = savedDashboard.timeRestore
    ? convertTimeToUTCString(timefilter.getTime().from)
    : undefined;
  savedDashboard.timeTo = savedDashboard.timeRestore
    ? convertTimeToUTCString(timefilter.getTime().to)
    : undefined;
  const timeRestoreObj: RefreshInterval = _.pick(timefilter.getRefreshInterval(), [
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

  try {
    const newId = await savedDashboard.save(saveOptions);
    if (newId) {
      toasts.addSuccess({
        title: dashboardSaveToastStrings.getSuccessString(currentState.title),
        'data-test-subj': 'saveDashboardSuccess',
      });
      if (newId !== lastDashboardId) {
        // TODO: Dashboard session storage
        // dashboardPanelStorage.clearPanels(lastDashboardId);
        redirectTo({
          id: newId,
          // editMode: true,
          destination: 'dashboard',
          useReplace: true,
        });
        return { redirected: true, id: newId };
      }
    }
    return { id: newId };
  } catch (error) {
    toasts.addDanger({
      title: dashboardSaveToastStrings.getFailureString(currentState.title, error.message),
      'data-test-subj': 'saveDashboardFailure',
    });
    return { error };
  }
};
