/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
import moment, { Moment } from 'moment';

import { extractSearchSourceReferences, RefreshInterval } from '@kbn/data-plugin/public';
import { isFilterPinned } from '@kbn/es-query';

import { convertPanelMapToSavedPanels, extractReferences } from '../../../../common';
import { DashboardAttributes, DashboardCrudTypes } from '../../../../common/content_management';
import { generateNewPanelIds } from '../../../../common/lib/dashboard_panel_converters';
import { DASHBOARD_CONTENT_ID } from '../../../dashboard_constants';
import { LATEST_DASHBOARD_CONTAINER_VERSION } from '../../../dashboard_container';
import { dashboardSaveToastStrings } from '../../../dashboard_container/_dashboard_container_strings';
import { DashboardStartDependencies } from '../../../plugin';
import {
  coreServices,
  dataService,
  embeddableService,
  savedObjectsTaggingService,
} from '../../kibana_services';
import { dashboardContentManagementCache } from '../dashboard_content_management_cache';
import { SaveDashboardProps, SaveDashboardReturn } from '../types';
import { convertDashboardVersionToNumber } from './dashboard_versioning';
import { DashboardBackupServiceType } from '../../dashboard_backup/types';

export const convertTimeToUTCString = (time?: string | Moment): undefined | string => {
  if (moment(time).isValid()) {
    return moment(time).utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
  } else {
    // If it's not a valid moment date, then it should be a string representing a relative time
    // like 'now' or 'now-15m'.
    return time as string;
  }
};

type SaveDashboardStateProps = SaveDashboardProps & {
  contentManagement: DashboardStartDependencies['contentManagement'];
  dashboardBackup: DashboardBackupServiceType;
};

export const saveDashboardState = async ({
  controlGroupReferences,
  lastSavedId,
  saveOptions,
  currentState,
  panelReferences,
  dashboardBackup,
  contentManagement,
}: SaveDashboardStateProps): Promise<SaveDashboardReturn> => {
  const {
    search: dataSearchService,
    query: {
      timefilter: { timefilter },
    },
  } = dataService;

  const {
    tags,
    query,
    title,
    filters,
    timeRestore,
    description,

    // Dashboard options
    useMargins,
    syncColors,
    syncCursor,
    syncTooltips,
    hidePanelTitles,
    controlGroupInput,
  } = currentState;

  let { panels } = currentState;
  let prefixedPanelReferences = panelReferences;
  if (saveOptions.saveAsCopy) {
    const { panels: newPanels, references: newPanelReferences } = generateNewPanelIds(
      panels,
      panelReferences
    );
    panels = newPanels;
    prefixedPanelReferences = newPanelReferences;
    //
    // do not need to generate new ids for controls.
    // ControlGroup Component is keyed on dashboard id so changing dashboard id mounts new ControlGroup Component.
    //
  }

  /**
   * Stringify filters and query into search source JSON
   */
  const { searchSourceJSON, searchSourceReferences } = await (async () => {
    const searchSource = await dataSearchService.searchSource.create();
    searchSource.setField(
      'filter', // save only unpinned filters
      filters.filter((filter) => !isFilterPinned(filter))
    );
    searchSource.setField('query', query);

    const rawSearchSourceFields = searchSource.getSerializedFields();
    const [fields, references] = extractSearchSourceReferences(rawSearchSourceFields);
    return { searchSourceReferences: references, searchSourceJSON: JSON.stringify(fields) };
  })();

  /**
   * Stringify options and panels
   */
  const optionsJSON = JSON.stringify({
    useMargins,
    syncColors,
    syncCursor,
    syncTooltips,
    hidePanelTitles,
  });
  const panelsJSON = JSON.stringify(convertPanelMapToSavedPanels(panels, true));

  /**
   * Parse global time filter settings
   */
  const { from, to } = timefilter.getTime();
  const timeFrom = timeRestore ? convertTimeToUTCString(from) : undefined;
  const timeTo = timeRestore ? convertTimeToUTCString(to) : undefined;
  const refreshInterval = timeRestore
    ? (pick(timefilter.getRefreshInterval(), [
        'display',
        'pause',
        'section',
        'value',
      ]) as RefreshInterval)
    : undefined;

  const rawDashboardAttributes: DashboardAttributes = {
    version: convertDashboardVersionToNumber(LATEST_DASHBOARD_CONTAINER_VERSION),
    controlGroupInput,
    kibanaSavedObjectMeta: { searchSourceJSON },
    description: description ?? '',
    refreshInterval,
    timeRestore,
    optionsJSON,
    panelsJSON,
    timeFrom,
    title,
    timeTo,
  };

  /**
   * Extract references from raw attributes and tags into the references array.
   */
  const { attributes, references: dashboardReferences } = extractReferences(
    {
      attributes: rawDashboardAttributes,
      references: searchSourceReferences,
    },
    { embeddablePersistableStateService: embeddableService }
  );

  const references = savedObjectsTaggingService?.ui.updateTagsReferences
    ? savedObjectsTaggingService?.ui.updateTagsReferences(dashboardReferences, tags)
    : dashboardReferences;

  const allReferences = [
    ...references,
    ...(prefixedPanelReferences ?? []),
    ...(controlGroupReferences ?? []),
  ];

  /**
   * Save the saved object using the content management
   */
  const idToSaveTo = saveOptions.saveAsCopy ? undefined : lastSavedId;

  try {
    const result = idToSaveTo
      ? await contentManagement.client.update<
          DashboardCrudTypes['UpdateIn'],
          DashboardCrudTypes['UpdateOut']
        >({
          id: idToSaveTo,
          contentTypeId: DASHBOARD_CONTENT_ID,
          data: attributes,
          options: {
            references: allReferences,
            /** perform a "full" update instead, where the provided attributes will fully replace the existing ones */
            mergeAttributes: false,
          },
        })
      : await contentManagement.client.create<
          DashboardCrudTypes['CreateIn'],
          DashboardCrudTypes['CreateOut']
        >({
          contentTypeId: DASHBOARD_CONTENT_ID,
          data: attributes,
          options: {
            references: allReferences,
          },
        });

    const newId = result.item.id;

    if (newId) {
      coreServices.notifications.toasts.addSuccess({
        title: dashboardSaveToastStrings.getSuccessString(currentState.title),
        className: 'eui-textBreakWord',
        'data-test-subj': 'saveDashboardSuccess',
      });

      /**
       * If the dashboard id has been changed, redirect to the new ID to keep the url param in sync.
       */
      if (newId !== lastSavedId) {
        dashboardBackup.clearState(lastSavedId);
        return { redirectRequired: true, id: newId, references: allReferences };
      } else {
        dashboardContentManagementCache.deleteDashboard(newId); // something changed in an existing dashboard, so delete it from the cache so that it can be re-fetched
      }
    }
    return { id: newId, references: allReferences };
  } catch (error) {
    coreServices.notifications.toasts.addDanger({
      title: dashboardSaveToastStrings.getFailureString(currentState.title, error.message),
      'data-test-subj': 'saveDashboardFailure',
    });
    return { error };
  }
};
