/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IScopedClusterClient, SavedObjectsClientContract } from '../../../../core/server';

const LOGS_INDEX_PATTERN = 'logs-*';
const METRICS_INDEX_PATTERN = 'metrics-*';

const INDEX_PREFIXES_TO_IGNORE = [
  '.ds-metrics-elastic_agent', // ignore index created by Fleet server itself
  '.ds-logs-elastic_agent', // ignore index created by Fleet server itself
];

interface Deps {
  esClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
}

export const isNewInstance = async ({ esClient, soClient }: Deps): Promise<boolean> => {
  const indexPatterns = await soClient.find<{ title: string }>({
    type: 'index-pattern',
    fields: ['title'],
    search: `*`,
    searchFields: ['title'],
    perPage: 100,
  });

  // If there are no index patterns, assume this is a new instance
  if (indexPatterns.total === 0) {
    return true;
  }

  // If there are any index patterns that are not the default metrics-* and logs-* ones created by Fleet, assume this
  // is not a new instance
  if (
    indexPatterns.saved_objects.some(
      (ip) =>
        ip.attributes.title !== LOGS_INDEX_PATTERN && ip.attributes.title !== METRICS_INDEX_PATTERN
    )
  ) {
    return false;
  }

  try {
    const logsAndMetricsIndices = await esClient.asCurrentUser.cat.indices({
      index: `${LOGS_INDEX_PATTERN},${METRICS_INDEX_PATTERN}`,
      format: 'json',
    });

    const anyIndicesContainerUserData = logsAndMetricsIndices.body
      // Ignore some data that is shipped by default
      .filter(({ index }) => !INDEX_PREFIXES_TO_IGNORE.some((prefix) => index?.startsWith(prefix)))
      // If any other logs and metrics indices have data, return false
      .some((catResult) => (catResult['docs.count'] ?? '0') !== '0');

    return !anyIndicesContainerUserData;
  } catch (e) {
    // If any errors are encountered return false to be safe
    return false;
  }
};
