/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ISearchOptions } from '../../../../common';

/**
 * Get the `total`/`loaded` for this response (see `IKibanaSearchResponse`). Note that `skipped` is
 * not included as it is already included in `successful`.
 * @internal
 */
export function getTotalLoaded(response: estypes.SearchResponse<unknown>) {
  const { total, failed, successful } = response._shards;
  const loaded = failed + successful;
  return { total, loaded };
}

/**
 * Get the Kibana representation of this response (see `IKibanaSearchResponse`).
 * @internal
 */
export function toKibanaSearchResponse(rawResponse: estypes.SearchResponse<unknown>) {
  return {
    rawResponse,
    isPartial: false,
    isRunning: false,
    ...getTotalLoaded(rawResponse),
  };
}

/**
 * Temporary workaround until https://github.com/elastic/kibana/issues/26356 is addressed.
 * Since we are setting `track_total_hits` in the request, `hits.total` will be an object
 * containing the `value`.
 *
 * @internal
 */
export function shimHitsTotal(
  response: estypes.SearchResponse<unknown>,
  { legacyHitsTotal = true }: ISearchOptions = {}
) {
  if (!legacyHitsTotal) return response;
  const total = (response.hits?.total as any)?.value ?? response.hits?.total;
  const hits = { ...response.hits, total };
  return { ...response, hits };
}
