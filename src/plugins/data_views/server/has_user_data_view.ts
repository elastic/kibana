/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ElasticsearchClient,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { DataViewSavedObjectAttrs } from '../common/data_views';

interface Deps {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
}

export const getDataViews = async ({
  soClient,
}: Deps): Promise<SavedObjectsFindResponse<DataViewSavedObjectAttrs, unknown>> =>
  soClient.find<DataViewSavedObjectAttrs>({
    type: 'index-pattern',
    fields: ['title'],
    search: `*`,
    searchFields: ['title'],
    perPage: 100,
  });

/**
 * Checks if user has access to any data view,
 * excluding those that are automatically created by ese (hardcoded)
 * @param esClient
 * @param soClient
 * @param dataViews
 */
export const hasUserDataView = async (
  { esClient, soClient }: Deps,
  dataViews?: SavedObjectsFindResponse<DataViewSavedObjectAttrs, unknown>
): Promise<boolean> => {
  if (!dataViews) {
    dataViews = await getDataViews({ esClient, soClient });
  }

  if (dataViews.total === 0) {
    return false;
  } else {
    // filter here data views that we know are not created by user during on-boarding for smoother on-boarding experience

    const nonDefaultDataViews = dataViews.saved_objects.filter(
      (so) => so.id !== 'log_rules_data_view' && so.id !== 'infra_rules_data_view'
    );

    if (nonDefaultDataViews.length === 0) {
      return false;
    }

    return true;
  }
};
