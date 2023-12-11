/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';

function getFailedShardCause(error: estypes.ErrorCause): estypes.ErrorCause | undefined {
  const failedShards = error.failed_shards || error.caused_by?.failed_shards;
  return failedShards ? failedShards[0]?.reason : undefined;
}

function getNestedCause(error: estypes.ErrorCause): estypes.ErrorCause {
  return error.caused_by ? getNestedCause(error.caused_by) : error;
}

export function getRootCause(error?: estypes.ErrorCause): estypes.ErrorCause | undefined {
  return error
    ? // Give shard failures priority, then try to get the error navigating nested objects
      getFailedShardCause(error) || getNestedCause(error)
    : undefined;
}
