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
  /**
   * Exposes a low-level client for using ES search functionality on saved objects.
   *
   * @example
   * ```typescript
   * const response = await savedObjectsClient.getSearchClient().search({
   *  query: { ... },
   *  runtime_mappings: { ... },
   * });
   * ```
   *
   * @remarks
   * - Use this client for mult-type searche and aggergations that need more powerful ES search
   *   capabilities than what SavedObjectsClient.find provides.
   * - This client does not support providing an index to search against. That is inferred from the saved objects type
   * - This client still adheres to saved object concepts like namespaces and type mappings
   * - This client returns raw Elasticsearch documents, not saved objects
   */
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
