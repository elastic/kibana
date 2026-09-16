/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ElasticsearchClient,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import type { DataViewSavedObjectAttrs } from '../common/data_views';

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
 * This function currently returns true if there are any data views
 * It was created to filter out hard coded data views that were not created by the user.
 * Given we find a case where we need to distinguish between user-created and managed data views,
 * This function may need to be updated accordingly, or removed since hasDataView should be used instead.
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
  return dataViews.total > 0;
};
