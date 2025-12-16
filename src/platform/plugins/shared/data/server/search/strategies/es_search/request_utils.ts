/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { IUiSettingsClient, SharedGlobalConfig } from '@kbn/core/server';
import { sanitizeProjectRoutingForES } from '@kbn/es-query';
import type { IAsyncSearchRequestParams } from '../..';
import type { ESQLSearchParams } from '@kbn/es-types';
import { UI_SETTINGS } from '../../../../common';

export function getShardTimeout(
  config: SharedGlobalConfig
): Pick<estypes.SearchRequest, 'timeout'> {
  const timeout = config.elasticsearch.shardTimeout.asMilliseconds();
  return timeout ? { timeout: `${timeout}ms` } : {};
}

export async function getDefaultSearchParams(
  uiSettingsClient: Pick<IUiSettingsClient, 'get'>,
  options = { isPit: false }
): Promise<{
  max_concurrent_shard_requests?: number;
  ignore_unavailable?: boolean;
  track_total_hits: boolean;
}> {
  const maxConcurrentShardRequests = await uiSettingsClient.get<number>(
    UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS
  );

  const defaults: Awaited<ReturnType<typeof getDefaultSearchParams>> = {
    max_concurrent_shard_requests:
      maxConcurrentShardRequests > 0 ? maxConcurrentShardRequests : undefined,
    track_total_hits: true,
  };

  // If the request has a point-in-time ID attached, it can not include ignore_unavailable from {@link estypes.IndicesOptions}.
  // ES will reject the request as that option was set when the point-in-time was created.
  // Otherwise, this option allows search to not fail when the index/indices don't exist
  if (!options.isPit) {
    defaults.ignore_unavailable = true;
  }

  return defaults;
}

/**
 * Extracts and sanitizes project_routing parameter from search request params.
 * Handles both request structures: params.project_routing OR params.body.project_routing
 *
 * @param params - Search request parameters (can be IAsyncSearchRequestParams or ESQLSearchParams)
 * @returns Sanitized project_routing value (undefined if value is '_alias:*' or not set)
 */
export function getProjectRouting(
  params?: IAsyncSearchRequestParams | ESQLSearchParams
): string | undefined {
  if (!params) {
    return undefined;
  }

  console.log('$$$$$', params);

  // Handle both structures: params.project_routing OR params.body.project_routing
  const rawValue = (params as any).body?.project_routing ?? (params as any).project_routing;
  return sanitizeProjectRoutingForES(rawValue);
}
