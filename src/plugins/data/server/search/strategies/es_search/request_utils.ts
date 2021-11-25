/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IUiSettingsClient, SharedGlobalConfig } from 'kibana/server';
import { UI_SETTINGS } from '../../../../common';

export function getShardTimeout(
  config: SharedGlobalConfig
): Pick<estypes.SearchRequest, 'timeout'> {
  const timeout = config.elasticsearch.shardTimeout.asMilliseconds();
  return timeout ? { timeout: `${timeout}ms` } : {};
}

export async function getDefaultSearchParams(
  uiSettingsClient: Pick<IUiSettingsClient, 'get'>
): Promise<{
  max_concurrent_shard_requests?: number;
  ignore_unavailable: boolean;
  track_total_hits: boolean;
}> {
  const maxConcurrentShardRequests = await uiSettingsClient.get<number>(
    UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS
  );
  return {
    max_concurrent_shard_requests:
      maxConcurrentShardRequests > 0 ? maxConcurrentShardRequests : undefined,
    ignore_unavailable: true, // Don't fail if the index/indices don't exist
    track_total_hits: true,
  };
}
