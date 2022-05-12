/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

import { isFilterPinned } from '@kbn/es-query';
import { convertTimeToUTCString } from '.';
import { NotificationsStart } from '../../services/core';
import { DashboardSavedObject } from '../../saved_dashboards';
import { DashboardRedirect, DashboardState } from '../../types';
import { SavedObjectSaveOpts } from '../../services/saved_objects';
import { dashboardSaveToastStrings } from '../../dashboard_strings';
import { getHasTaggingCapabilitiesGuard } from './dashboard_tagging';
import { SavedObjectsTaggingApi } from '../../services/saved_objects_tagging_oss';
import { RefreshInterval, TimefilterContract } from '../../services/data';
import { convertPanelStateToSavedDashboardPanel } from '../../../common/embeddable/embeddable_saved_object_converters';
import { DashboardSessionStorage } from './dashboard_session_storage';
import { serializeControlGroupToDashboardSavedObject } from './dashboard_control_group';

export type SavedDashboardSaveOpts = SavedObjectSaveOpts & { stayInEditMode?: boolean };

interface SaveDashboardProps {
  version: string;
  redirectTo: DashboardRedirect;
  currentState: DashboardState;
  timefilter: TimefilterContract;
  saveOptions: SavedDashboardSaveOpts;
  toasts: NotificationsStart['toasts'];
  savedDashboard: DashboardSavedObject;
  savedObjectsTagging?: SavedObjectsTaggingApi;
  dashboardSessionStorage: DashboardSessionStorage;
}

export const saveDashboard = async ({
  toasts,
  version,
  redirectTo,
  timefilter,
  saveOptions,
  currentState,
  savedDashboard,
  savedObjectsTagging,
  dashboardSessionStorage,
}: SaveDashboardProps): Promise<{ id?: string; redirected?: boolean; error?: any }> => {
  const lastDashboardId = savedDashboard.id;
  const hasTaggingCapabilities = getHasTaggingCapabilitiesGuard(savedObjectsTagging);

  const { panels, title, tags, description, timeRestore, options } = currentState;

  const savedDashboardPanels = Object.values(panels).map((panel) =>
    convertPanelStateToSavedDashboardPanel(panel, version)
  );

  savedDashboard.title = title;
  savedDashboard.description = description;
  savedDashboard.timeRestore = timeRestore;
  savedDashboard.optionsJSON = JSON.stringify(options);
  savedDashboard.panelsJSON = JSON.stringify(savedDashboardPanels);

  // control group input
  serializeControlGroupToDashboardSavedObject(savedDashboard, currentState);

  if (hasTaggingCapabilities(savedDashboard)) {
    savedDashboard.setTags(tags);
  }

  const { from, to } = timefilter.getTime();
  savedDashboard.timeFrom = savedDashboard.timeRestore ? convertTimeToUTCString(from) : undefined;
  savedDashboard.timeTo = savedDashboard.timeRestore ? convertTimeToUTCString(to) : undefined;

  const timeRestoreObj: RefreshInterval = _.pick(timefilter.getRefreshInterval(), [
    'display',
    'pause',
    'section',
    'value',
  ]) as RefreshInterval;
  savedDashboard.refreshInterval = savedDashboard.timeRestore ? timeRestoreObj : undefined;

  // only save unpinned filters
  const unpinnedFilters = savedDashboard.getFilters().filter((filter) => !isFilterPinned(filter));
  savedDashboard.searchSource.setField('filter', unpinnedFilters);

  try {
    const newId = await savedDashboard.save(saveOptions);
    if (newId) {
      toasts.addSuccess({
        title: dashboardSaveToastStrings.getSuccessString(currentState.title),
        'data-test-subj': 'saveDashboardSuccess',
      });

      /**
       * If the dashboard id has been changed, redirect to the new ID to keep the url param in sync.
       */
      if (newId !== lastDashboardId) {
        dashboardSessionStorage.clearState(lastDashboardId);
        redirectTo({
          id: newId,
          editMode: true,
          useReplace: true,
          destination: 'dashboard',
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
