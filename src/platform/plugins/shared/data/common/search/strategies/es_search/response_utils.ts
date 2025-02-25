/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { ISearchOptions } from '@kbn/search-types';

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
