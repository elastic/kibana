/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { estypes } from '@elastic/elasticsearch';
import type { Start as InspectorStartContract, RequestAdapter } from '@kbn/inspector-plugin/public';
import type { SearchResponseWarning } from './types';

/**
 * @internal
 */
export function extractWarnings(
  rawResponse: estypes.SearchResponse,
  inspectorService: InspectorStartContract,
  requestAdapter: RequestAdapter,
  requestName: string,
  requestId?: string
): SearchResponseWarning[] {
  const warnings: SearchResponseWarning[] = [];

  const isPartial = rawResponse._clusters
    ? rawResponse._clusters.partial > 0 ||
      rawResponse._clusters.skipped > 0 ||
      rawResponse._clusters.running > 0
    : rawResponse.timed_out || rawResponse._shards.failed > 0;
  if (isPartial) {
    warnings.push({
      type: 'incomplete',
      requestName,
      clusters: rawResponse._clusters
        ? rawResponse._clusters.details ?? {}
        : {
            '(local)': {
              status: 'partial',
              indices: '',
              took: rawResponse.took,
              timed_out: rawResponse.timed_out,
              _shards: rawResponse._shards,
              failures: rawResponse._shards.failures,
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
