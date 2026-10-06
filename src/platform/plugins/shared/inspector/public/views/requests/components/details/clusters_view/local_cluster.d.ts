/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
export declare const LOCAL_CLUSTER_KEY = '(local)';
export declare function getLocalClusterDetails(rawResponse: estypes.SearchResponse): {
  status: estypes.ClusterSearchStatus;
  indices: string;
  took: number;
  timed_out: boolean;
  _shards: {
    failed: estypes.uint;
    successful: estypes.uint;
    total: estypes.uint;
    failures?: estypes.ShardFailure[];
    skipped?: estypes.uint;
  };
  failures: estypes.ShardFailure[] | undefined;
};
