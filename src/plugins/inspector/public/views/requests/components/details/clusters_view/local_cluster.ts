/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import type { ClusterDetails } from '@kbn/es-types';

export const LOCAL_CLUSTER_KEY = '(local)';

function getLocalClusterStatus(rawResponse: estypes.SearchResponse): ClusterDetails['status'] {
  if (rawResponse._shards?.successful === 0) {
    return 'failed';
  }

  if (rawResponse.timed_out || rawResponse._shards.failed) {
    return 'partial';
  }

  return 'successful';
}

export function getLocalClusterDetails(rawResponse: estypes.SearchResponse) {
  const shards = {
    ...rawResponse._shards,
  };
  delete shards.failures;
  return {
    status: getLocalClusterStatus(rawResponse),
    indices: '',
    took: rawResponse.took,
    timed_out: rawResponse.timed_out,
    _shards: shards,
    failures: rawResponse._shards.failures,
  };
}
