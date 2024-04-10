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
  controlGroupInputToRawControlGroupAttributes,
  generateNewControlIds,
  getDefaultControlGroupInput,
  persistableControlGroupInputIsEqual,
} from '@kbn/controls-plugin/common';
import { extractSearchSourceReferences, RefreshInterval } from '@kbn/data-plugin/public';
import { isFilterPinned } from '@kbn/es-query';

import { convertPanelMapToSavedPanels, extractReferences } from '../../../../common';
import { DashboardAttributes, DashboardCrudTypes } from '../../../../common/content_management';
import { generateNewPanelIds } from '../../../../common/lib/dashboard_panel_converters';
import { DASHBOARD_CONTENT_ID } from '../../../dashboard_constants';
import { LATEST_DASHBOARD_CONTAINER_VERSION } from '../../../dashboard_container';
import { dashboardSaveToastStrings } from '../../../dashboard_container/_dashboard_container_strings';
import { DashboardStartDependencies } from '../../../plugin';
import { dashboardContentManagementCache } from '../dashboard_content_management_service';
import {
  DashboardContentManagementRequiredServices,
  SaveDashboardProps,
  SaveDashboardReturn,
  SavedDashboardInput,
} from '../types';
import { convertDashboardVersionToNumber } from './dashboard_versioning';

export const serializeControlGroupInput = (
  controlGroupInput: SavedDashboardInput['controlGroupInput']
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
  dashboardBackup: DashboardContentManagementRequiredServices['dashboardBackup'];
  initializerContext: DashboardContentManagementRequiredServices['initializerContext'];
  savedObjectsTagging: DashboardContentManagementRequiredServices['savedObjectsTagging'];
};

export const saveDashboardState = async ({
  data,
  embeddable,
  lastSavedId,
  saveOptions,
  currentState,
  panelReferences,
  dashboardBackup,
  contentManagement,
  savedObjectsTagging,
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
    filters,
    timeRestore,
    description,

    // Dashboard options
    useMargins,
    syncColors,
    syncCursor,
    syncTooltips,
    hidePanelTitles,
  } = currentState;

  let { panels, controlGroupInput } = currentState;
  if (saveOptions.saveAsCopy) {
    panels = generateNewPanelIds(panels);
    controlGroupInput = generateNewControlIds(controlGroupInput);
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

  const allReferences = [...references, ...(panelReferences ?? [])];

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
      options: {
        id: idToSaveTo,
        references: allReferences,
        overwrite: true,
      },
    });
    const newId = result.item.id;

    if (newId) {
      toasts.addSuccess({
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
    toasts.addDanger({
      title: dashboardSaveToastStrings.getFailureString(currentState.title, error.message),
      'data-test-subj': 'saveDashboardFailure',
    });
    return { error };
  }
};
