/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from '../../../core/server';
import { IndexPatternSavedObjectAttrs } from '../common/data_views';
import { FLEET_ASSETS_TO_IGNORE } from '../common/constants';

interface Deps {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
}

export const hasUserIndexPattern = async ({ esClient, soClient }: Deps): Promise<boolean> => {
  const indexPatterns = await soClient.find<IndexPatternSavedObjectAttrs>({
    type: 'index-pattern',
    fields: ['title'],
    search: `*`,
    searchFields: ['title'],
    perPage: 100,
  });

  if (indexPatterns.total === 0) {
    return false;
  }

  // If there are any index patterns that are not the default metrics-* and logs-* ones created by Fleet,
  // assume there are user created index patterns
  if (
    indexPatterns.saved_objects.some(
      (ip) =>
        ip.attributes.title !== FLEET_ASSETS_TO_IGNORE.METRICS_INDEX_PATTERN &&
        ip.attributes.title !== FLEET_ASSETS_TO_IGNORE.LOGS_INDEX_PATTERN
    )
  ) {
    return true;
  }

  const resolveResponse = await esClient.indices.resolveIndex({
    name: `${FLEET_ASSETS_TO_IGNORE.LOGS_INDEX_PATTERN},${FLEET_ASSETS_TO_IGNORE.METRICS_INDEX_PATTERN}`,
  });

  const hasAnyNonDefaultFleetIndices = resolveResponse.body.indices.some(
    (ds) => ds.name !== FLEET_ASSETS_TO_IGNORE.METRICS_ENDPOINT_INDEX_TO_IGNORE
  );

  if (hasAnyNonDefaultFleetIndices) return true;

  const hasAnyNonDefaultFleetDataStreams = resolveResponse.body.data_streams.some(
    (ds) =>
      ds.name !== FLEET_ASSETS_TO_IGNORE.METRICS_DATA_STREAM_TO_IGNORE &&
      ds.name !== FLEET_ASSETS_TO_IGNORE.LOGS_DATA_STREAM_TO_IGNORE
  );

  if (hasAnyNonDefaultFleetDataStreams) return true;

  return false;
};
