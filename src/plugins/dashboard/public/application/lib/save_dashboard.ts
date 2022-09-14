/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

import { isFilterPinned } from '@kbn/es-query';
import type { RefreshInterval } from '@kbn/data-plugin/public';
import type { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';

import { convertTimeToUTCString } from '.';
import type { DashboardSavedObject } from '../../saved_dashboards';
import { dashboardSaveToastStrings } from '../../dashboard_strings';
import { getHasTaggingCapabilitiesGuard } from './dashboard_tagging';
import type { DashboardRedirect, DashboardState } from '../../types';
import { serializeControlGroupToDashboardSavedObject } from './dashboard_control_group';
import { convertPanelStateToSavedDashboardPanel } from '../../../common/embeddable/embeddable_saved_object_converters';
import { pluginServices } from '../../services/plugin_services';

export type SavedDashboardSaveOpts = SavedObjectSaveOpts & { stayInEditMode?: boolean };

interface SaveDashboardProps {
  redirectTo: DashboardRedirect;
  currentState: DashboardState;
  saveOptions: SavedDashboardSaveOpts;
  savedDashboard: DashboardSavedObject;
}

export const saveDashboard = async ({
  redirectTo,
  saveOptions,
  currentState,
  savedDashboard,
}: SaveDashboardProps): Promise<{ id?: string; redirected?: boolean; error?: any }> => {
  const {
    data: {
      query: {
        timefilter: { timefilter },
      },
    },
    dashboardSessionStorage,
    initializerContext: { kibanaVersion },
    notifications,
  } = pluginServices.getServices();

  const lastDashboardId = savedDashboard.id;
  const hasTaggingCapabilities = getHasTaggingCapabilitiesGuard();

  const { panels, title, tags, description, timeRestore, options } = currentState;

  const savedDashboardPanels = Object.values(panels).map((panel) =>
    convertPanelStateToSavedDashboardPanel(panel, kibanaVersion)
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
      notifications.toasts.addSuccess({
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
    notifications.toasts.addDanger(
      dashboardSaveToastStrings.getFailureString(currentState.title, error.message),
      {
        'data-test-subj': 'saveDashboardFailure',
      }
    );
    return { error };
  }
};
