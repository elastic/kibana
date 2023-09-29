/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick } from 'lodash';
import moment, { Moment } from 'moment';

import {
  getDefaultControlGroupInput,
  persistableControlGroupInputIsEqual,
  controlGroupInputToRawControlGroupAttributes,
} from '@kbn/controls-plugin/common';
import { isFilterPinned } from '@kbn/es-query';
import { extractSearchSourceReferences, RefreshInterval } from '@kbn/data-plugin/public';

import {
  extractReferences,
  DashboardContainerInput,
  convertPanelMapToSavedPanels,
} from '../../../../common';
import {
  SaveDashboardProps,
  SaveDashboardReturn,
  DashboardContentManagementRequiredServices,
} from '../types';
import { DashboardStartDependencies } from '../../../plugin';
import { DASHBOARD_CONTENT_ID } from '../../../dashboard_constants';
import { convertDashboardVersionToNumber } from './dashboard_versioning';
import { LATEST_DASHBOARD_CONTAINER_VERSION } from '../../../dashboard_container';
import { dashboardContentManagementCache } from '../dashboard_content_management_service';
import { DashboardCrudTypes, DashboardAttributes } from '../../../../common/content_management';
import { dashboardSaveToastStrings } from '../../../dashboard_container/_dashboard_container_strings';

export const serializeControlGroupInput = (
  controlGroupInput: DashboardContainerInput['controlGroupInput']
) => {
  // only save to saved object if control group is not default
  if (
    !controlGroupInput ||
    persistableControlGroupInputIsEqual(controlGroupInput, getDefaultControlGroupInput())
  ) {
    return undefined;
  }
  return controlGroupInputToRawControlGroupAttributes(controlGroupInput);
};

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
  data: DashboardContentManagementRequiredServices['data'];
  contentManagement: DashboardStartDependencies['contentManagement'];
  embeddable: DashboardContentManagementRequiredServices['embeddable'];
  notifications: DashboardContentManagementRequiredServices['notifications'];
  initializerContext: DashboardContentManagementRequiredServices['initializerContext'];
  savedObjectsTagging: DashboardContentManagementRequiredServices['savedObjectsTagging'];
  dashboardSessionStorage: DashboardContentManagementRequiredServices['dashboardSessionStorage'];
};

export const saveDashboardState = async ({
  data,
  embeddable,
  lastSavedId,
  saveOptions,
  currentState,
  contentManagement,
  savedObjectsTagging,
  dashboardSessionStorage,
  notifications: { toasts },
}: SaveDashboardStateProps): Promise<SaveDashboardReturn> => {
  const {
    search: dataSearchService,
    query: {
      timefilter: { timefilter },
    },
  } = data;

  const {
    tags,
    query,
    title,
    panels,
    filters,
    version,
    timeRestore,
    description,
    controlGroupInput,

    // Dashboard options
    useMargins,
    syncColors,
    syncCursor,
    syncTooltips,
    hidePanelTitles,
  } = currentState;

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
    version: convertDashboardVersionToNumber(version ?? LATEST_DASHBOARD_CONTAINER_VERSION),
    controlGroupInput: serializeControlGroupInput(controlGroupInput),
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
    { embeddablePersistableStateService: embeddable }
  );

  const references = savedObjectsTagging.updateTagsReferences
    ? savedObjectsTagging.updateTagsReferences(dashboardReferences, tags)
    : dashboardReferences;

  /**
   * Save the saved object using the content management
   */
  const idToSaveTo = saveOptions.saveAsCopy ? undefined : lastSavedId;
  try {
    const result = await contentManagement.client.create<
      DashboardCrudTypes['CreateIn'],
      DashboardCrudTypes['CreateOut']
    >({
      contentTypeId: DASHBOARD_CONTENT_ID,
      data: attributes,
      options: { id: idToSaveTo, references, overwrite: true },
    });
    const newId = result.item.id;

    if (newId) {
      toasts.addSuccess({
        title: dashboardSaveToastStrings.getSuccessString(currentState.title),
        'data-test-subj': 'saveDashboardSuccess',
      });

      /**
       * If the dashboard id has been changed, redirect to the new ID to keep the url param in sync.
       */
      if (newId !== lastSavedId) {
        dashboardSessionStorage.clearState(lastSavedId);
        return { redirectRequired: true, id: newId };
      } else {
        dashboardContentManagementCache.deleteDashboard(newId); // something changed in an existing dashboard, so delete it from the cache so that it can be re-fetched
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
