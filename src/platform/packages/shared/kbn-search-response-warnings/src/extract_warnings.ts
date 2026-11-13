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
 * Elasticsearch reports a reachable remote cluster with no index matching the requested pattern
 * as skipped, with zero shards and no failures. Unreachable clusters carry failures.
 */
const isEmptyCluster = ({ status, _shards, failures }: estypes.ClusterDetails): boolean =>
  status === 'skipped' && _shards?.total === 0 && !failures?.length;

/**
 * @internal
 * With `ignoreEmptyClusters`, clusters that have no index matching the requested pattern are not
 * counted as incomplete and are left out of the warning.
 */
export function extractWarnings(
  rawResponse: estypes.SearchResponse | ESQLSearchResponse,
  inspectorService: InspectorStartContract,
  requestAdapter: RequestAdapter,
  requestName: string,
  requestId?: string,
  { ignoreEmptyClusters = false }: { ignoreEmptyClusters?: boolean } = {}
): SearchResponseWarning[] {
  const warnings: SearchResponseWarning[] = [];

  const clusterDetails = rawResponse._clusters?.details ?? {};
  const reportableClusters = Object.fromEntries(
    Object.entries(clusterDetails).filter(
      ([, details]) => !(ignoreEmptyClusters && isEmptyCluster(details))
    )
  );
  const emptyClustersCount =
    Object.keys(clusterDetails).length - Object.keys(reportableClusters).length;

  // ES|QL supports _clusters in case of CCS but doesnt support _shards and timed_out (yet)
  const isPartial = rawResponse._clusters
    ? rawResponse._clusters.partial > 0 ||
      rawResponse._clusters.skipped - emptyClustersCount > 0 ||
      rawResponse._clusters.running > 0
    : ('timed_out' in rawResponse && rawResponse.timed_out) ||
      ('_shards' in rawResponse && rawResponse._shards.failed > 0);
  if (isPartial) {
    warnings.push({
      type: 'incomplete',
      requestName,
      clusters: rawResponse._clusters
        ? reportableClusters
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
