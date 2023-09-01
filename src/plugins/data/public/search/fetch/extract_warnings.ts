/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import type { ClusterDetails } from '@kbn/es-types';
import { SearchResponseWarning } from '../types';

/**
 * @internal
 */
export function extractWarnings(rawResponse: estypes.SearchResponse): SearchResponseWarning[] {
  const warnings: SearchResponseWarning[] = [];

  let isPartial = false;
  let clusters: Record<string, ClusterDetails> = {};
  if (rawResponse._clusters) {
    isPartial = Object.values(rawResponse._clusters.details).some(
      (clusterDetails) => clusterDetails.status !== 'successful'
    );
    clusters = rawResponse._clusters.details;
  } else if (rawResponse._shards && (rawResponse.timed_out || rawResponse._shards.failed > 0)) {
    // local cluster only
    isPartial = true;
    clusters['(local)'] = {
      status: 'partial',
      took: rawResponse.took,
      timed_out: rawResponse.timed_out,
      _shards: rawResponse._shards,
      failures: rawResponse._shards.failures,
    };
  }
  if (isPartial) {
    warnings.push({
      type: 'incomplete',
      message: i18n.translate('data.search.searchSource.fetch.incompleteResultsMessage', {
        defaultMessage: 'The data might be incomplete or wrong.',
      }),
      clusters,
    });
  }

  return warnings;
}
