/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick } from 'lodash';

import { isFilterPinned } from '@kbn/es-query';
import { SavedObjectsClientContract } from '@kbn/core/public';
import { SavedObjectAttributes } from '@kbn/core-saved-objects-common';

import { extractSearchSourceReferences, RefreshInterval } from '@kbn/data-plugin/public';
import { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';

import type { DashboardAttributes } from '../../../application';
import { DashboardSavedObjectRequiredServices } from '../types';
import { DashboardConstants } from '../../../dashboard_constants';
import { convertTimeToUTCString } from '../../../application/lib';
import { DashboardRedirect, DashboardState } from '../../../types';
import { dashboardSaveToastStrings } from '../../../dashboard_strings';
import { convertPanelMapToSavedPanels, extractReferences } from '../../../../common';
import { serializeControlGroupInput } from '../../../application/lib/dashboard_control_group';

export type SavedDashboardSaveOpts = SavedObjectSaveOpts & { saveAsCopy?: boolean };

export type SaveDashboardProps = DashboardSavedObjectRequiredServices & {
  currentState: DashboardState;
  redirectTo: DashboardRedirect;
  saveOptions: SavedDashboardSaveOpts;
  savedObjectsClient: SavedObjectsClientContract;
};

export interface SaveDashboardReturn {
  id?: string;
  error?: string;
  redirected?: boolean;
}

export const saveDashboardStateToSavedObject = async ({
  data,
  redirectTo,
  embeddable,
  saveOptions,
  currentState,
  savedObjectsClient,
  savedObjectsTagging,
  dashboardSessionStorage,
  notifications: { toasts },
  initializerContext: { kibanaVersion },
}: SaveDashboardProps): Promise<SaveDashboardReturn> => {
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
    options,
    timeRestore,
    description,
    savedObjectId,
    controlGroupInput,
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
  const optionsJSON = JSON.stringify(options);
  const panelsJSON = JSON.stringify(convertPanelMapToSavedPanels(panels, kibanaVersion));

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
    controlGroupInput: serializeControlGroupInput(controlGroupInput),
    kibanaSavedObjectMeta: { searchSourceJSON },
    refreshInterval,
    timeRestore,
    optionsJSON,
    description,
    panelsJSON,
    timeFrom,
    title,
    timeTo,
    version: 1, // todo - where does version come from? Why is it needed?
  };

  /**
   * Extract references from raw attributes and tags into the references array.
   */
  const { attributes, references: dashboardReferences } = extractReferences(
    {
      attributes: rawDashboardAttributes as unknown as SavedObjectAttributes,
      references: searchSourceReferences,
    },
    { embeddablePersistableStateService: embeddable }
  );
  const references = savedObjectsTagging.updateTagsReferences
    ? savedObjectsTagging.updateTagsReferences(dashboardReferences, tags)
    : dashboardReferences;

  /**
   * Save the saved object using the saved objects client
   */
  const idToSaveTo = saveOptions.saveAsCopy ? undefined : savedObjectId;
  try {
    const { id: newId } = await savedObjectsClient.create(
      DashboardConstants.DASHBOARD_SAVED_OBJECT_TYPE,
      attributes,
      {
        id: idToSaveTo,
        overwrite: true,
        references,
      }
    );

    if (newId) {
      toasts.addSuccess({
        title: dashboardSaveToastStrings.getSuccessString(currentState.title),
        'data-test-subj': 'saveDashboardSuccess',
      });

      /**
       * If the dashboard id has been changed, redirect to the new ID to keep the url param in sync.
       */
      if (newId !== savedObjectId) {
        dashboardSessionStorage.clearState(savedObjectId);
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
