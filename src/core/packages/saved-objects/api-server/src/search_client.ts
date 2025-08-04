/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes, TransportRequestOptionsWithOutMeta } from '@elastic/elasticsearch';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';

export interface SearchParams extends Omit<estypes.SearchRequest, 'index'> {
  namespaces: string[];
  types: string[];
}

/**
 * A low-level Elasticsearch client intended to interact with raw saved objects.
 *
 * TODO(@jloleysens): Write more docs
 */
export interface SearchClient {
  search: <T extends SavedObjectsRawDoc = SavedObjectsRawDoc, A = unknown>(
    params: SearchParams,
    options?: TransportRequestOptionsWithOutMeta
  ) => Promise<estypes.SearchResponse<T, A>>;

  openPointInTime: (
    params: estypes.OpenPointInTimeRequest
  ) => Promise<estypes.OpenPointInTimeResponse>;

  closePointInTime: (
    params: estypes.ClosePointInTimeRequest
  ) => Promise<estypes.ClosePointInTimeResponse>;
}
