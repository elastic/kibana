/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1";
 */

/**
 * Derives the number of primary shards a write-heavy index should have from the
 * size of the cluster.
 *
 * The result is the largest power of two that is `<= dataNodeCount` and
 * `<= maxShards` (and at least 1). Constraints:
 *  - Power of two so the index stays splittable on existing deployments, whose
 *    default `number_of_routing_shards` is a power of two that split targets
 *    must divide evenly.
 *  - `<= dataNodeCount` so primaries can be spread across distinct nodes; adding
 *    more primaries than nodes wouldn't relieve the per-node write bottleneck.
 *  - `<= maxShards` to avoid over-sharding very large clusters (the Task Manager
 *    index is small in bytes but write-heavy).
 */
export const calculateAdaptiveShardCount = (dataNodeCount: number, maxShards: number): number => {
  if (!Number.isFinite(dataNodeCount) || dataNodeCount <= 1 || maxShards < 2) {
    return 1;
  }
  const capped = Math.min(Math.floor(dataNodeCount), Math.floor(maxShards));
  return 2 ** Math.floor(Math.log2(capped));
};
