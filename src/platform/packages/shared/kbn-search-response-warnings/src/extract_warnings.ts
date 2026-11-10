/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { Start as InspectorStartContract, RequestAdapter } from '@kbn/inspector-plugin/public';
import type { SearchResponseWarning } from './types';

/**
 * A reachable remote with no index matching the pattern is `skipped`, has zero shards, and no failures.
 * That is not an incomplete result. A skipped cluster that timed out or has failures still is.
 */
const isEmptySkippedCluster = (cluster: estypes.ClusterDetails): boolean =>
  cluster.status === 'skipped' &&
  cluster.timed_out !== true &&
  cluster._shards?.total === 0 &&
  (cluster.failures == null || cluster.failures.length === 0);

const clustersForWarning = (
  clusters: estypes.ClusterStatistics
): Record<string, estypes.ClusterDetails> =>
  clusters.details
    ? Object.fromEntries(
        Object.entries(clusters.details).filter(([, cluster]) => !isEmptySkippedCluster(cluster))
      )
    : {};

const hasClusterProblem = (clusters: estypes.ClusterStatistics): boolean => {
  // Same counters as before. `failed` alone did not warn, and still does not.
  const counterProblem = clusters.partial > 0 || clusters.running > 0 || clusters.skipped > 0;
  if (!counterProblem) {
    return false;
  }

  const details = clusters.details;
  // No per-cluster details means a skip cannot be told apart from a disconnect.
  if (details == null) {
    return true;
  }

  const emptySkippedCount = Object.values(details).filter(isEmptySkippedCluster).length;
  const skippedAreOnlyEmpty = clusters.skipped > 0 && clusters.skipped <= emptySkippedCount;
  if (!skippedAreOnlyEmpty || clusters.partial > 0 || clusters.running > 0) {
    return true;
  }

  // The skip count is only empty clusters. Another cluster in the details can still be a problem.
  return Object.values(details).some(
    (cluster) => !isEmptySkippedCluster(cluster) && cluster.status !== 'successful'
  );
};

/**
 * @internal
 */
export function extractWarnings(
  rawResponse: estypes.SearchResponse | ESQLSearchResponse,
  inspectorService: InspectorStartContract,
  requestAdapter: RequestAdapter,
  requestName: string,
  requestId?: string
): SearchResponseWarning[] {
  const warnings: SearchResponseWarning[] = [];

  // ES|QL supports _clusters in case of CCS but doesnt support _shards and timed_out (yet)
  const isPartial = rawResponse._clusters
    ? hasClusterProblem(rawResponse._clusters)
    : ('timed_out' in rawResponse && rawResponse.timed_out) ||
      ('_shards' in rawResponse && rawResponse._shards.failed > 0);
  if (isPartial) {
    warnings.push({
      type: 'incomplete',
      requestName,
      clusters: rawResponse._clusters
        ? clustersForWarning(rawResponse._clusters)
        : {
            '(local)': {
              status: 'partial',
              indices: '',
              took: rawResponse.took,
              timed_out: 'timed_out' in rawResponse && rawResponse.timed_out,
              ...('_shards' in rawResponse
                ? { _shards: rawResponse._shards, failures: rawResponse._shards.failures }
                : {}),
            },
          },
      openInInspector: () => {
        inspectorService.open(
          {
            requests: requestAdapter,
          },
          {
            options: {
              initialRequestId: requestId,
              initialTabs: ['clusters', 'response'],
            },
          }
        );
      },
    });
  }

  return warnings;
}
