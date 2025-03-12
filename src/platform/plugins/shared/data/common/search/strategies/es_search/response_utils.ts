/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';

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

export function getHitsTotal(total: estypes.SearchHitsMetadata['total']): number | undefined {
  return typeof total === 'number' ? total : total?.value;
}
