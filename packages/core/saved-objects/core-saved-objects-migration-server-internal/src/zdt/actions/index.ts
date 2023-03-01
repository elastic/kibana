/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  IncompatibleClusterRoutingAllocation,
  RetryableEsClientError,
  WaitForTaskCompletionTimeout,
  IndexNotYellowTimeout,
  IndexNotGreenTimeout,
  ClusterShardLimitExceeded,
  IndexNotFound,
  AliasNotFound,
  IncompatibleMappingException,
} from '../../actions';

export {
  initAction as init,
  waitForIndexStatus,
  createIndex,
  updateAliases,
  updateMappings,
  updateAndPickupMappings,
  waitForPickupUpdatedMappingsTask,
  type InitActionParams,
  type IncompatibleClusterRoutingAllocation,
  type RetryableEsClientError,
  type WaitForTaskCompletionTimeout,
  type IndexNotFound,
} from '../../actions';

export interface ActionErrorTypeMap {
  wait_for_task_completion_timeout: WaitForTaskCompletionTimeout;
  incompatible_cluster_routing_allocation: IncompatibleClusterRoutingAllocation;
  retryable_es_client_error: RetryableEsClientError;
  index_not_found_exception: IndexNotFound;
  index_not_green_timeout: IndexNotGreenTimeout;
  index_not_yellow_timeout: IndexNotYellowTimeout;
  cluster_shard_limit_exceeded: ClusterShardLimitExceeded;
  alias_not_found_exception: AliasNotFound;
  incompatible_mapping_exception: IncompatibleMappingException;
}

/** Type guard for narrowing the type of a left */
export function isTypeof<T extends keyof ActionErrorTypeMap>(
  res: any,
  typeString: T
): res is ActionErrorTypeMap[T] {
  return res.type === typeString;
}
