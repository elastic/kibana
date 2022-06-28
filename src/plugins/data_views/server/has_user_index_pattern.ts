/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ElasticsearchClient,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { DataViewSavedObjectAttrs } from '../common/data_views';
import { DEFAULT_ASSETS_TO_IGNORE } from '../common/constants';

interface Deps {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
}

export const getIndexPattern = async ({
  soClient,
}: Deps): Promise<SavedObjectsFindResponse<DataViewSavedObjectAttrs, unknown>> =>
  soClient.find<DataViewSavedObjectAttrs>({
    type: 'index-pattern',
    fields: ['title'],
    search: `*`,
    searchFields: ['title'],
    perPage: 100,
  });

export const hasUserIndexPattern = async (
  { esClient, soClient }: Deps,
  indexPatterns?: SavedObjectsFindResponse<DataViewSavedObjectAttrs, unknown>
): Promise<boolean> => {
  if (!indexPatterns) {
    indexPatterns = await getIndexPattern({ esClient, soClient });
  }

  if (indexPatterns.total > 0) {
    return true;
  }

  const resolveResponse = await esClient.indices.resolveIndex({
    name: `${DEFAULT_ASSETS_TO_IGNORE.LOGS_INDEX_PATTERN}`,
  });

  if (resolveResponse) {
    if (resolveResponse.indices.length > 0) return true;

    const hasAnyNonDefaultFleetDataStreams = resolveResponse.data_streams.some(
      (ds) =>
        ds.name !== DEFAULT_ASSETS_TO_IGNORE.LOGS_DATA_STREAM_TO_IGNORE &&
        ds.name !== DEFAULT_ASSETS_TO_IGNORE.ENT_SEARCH_LOGS_DATA_STREAM_TO_IGNORE
    );
    if (hasAnyNonDefaultFleetDataStreams) return true;
  }
  return false;
};
