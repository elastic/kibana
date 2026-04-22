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
 * Options for the saved objects ES|QL query operation.
 *
 * This interface extends the Elasticsearch `EsqlQueryRequest` type, omitting fields that are
 * controlled server-side (`query`, `format`, `columnar`, `delimiter`), and adding saved-object-specific
 * options. The `FROM` clause is auto-generated from the `type` parameter via index resolution,
 * and security filters (namespace + type) are injected via the `filter` parameter.
 *
 * Consumers write only the ES|QL processing pipeline (everything after `FROM`).
 *
 * @remarks
 * **Security Warning:** The ES|QL query method provides low-level access to saved object data.
 * While the method injects namespace and type filters to enforce space-level security,
 * care must be taken when constructing pipelines with user input:
 *
 * - Use ES|QL named params (`?paramName`) with the `params` array to prevent injection attacks.
 *   Never interpolate user input directly into the pipeline string.
 * - Standalone encrypted scalar columns are always replaced with `null`.
 *   When `_source` is present (via `metadata: ['_id', '_source']`), encrypted attributes
 *   within `_source` are decrypted using the same path as `find` and `search`.
 *
 * @public
 */
export interface SavedObjectsEsqlOptions
  extends Omit<estypes.EsqlQueryRequest, 'format' | 'columnar' | 'delimiter' | 'query'> {
  /** The type or types of saved objects to query. Used for index resolution and security filtering. */
  type: string | string[];

  /** The namespaces to query within. */
  namespaces: string[];

  /**
   * The ES|QL processing pipeline (everything after the `FROM` clause).
   * The `FROM` clause is auto-generated from the `type` parameter.
   *
   * @example
   * ```
   * pipeline: '| KEEP dashboard.title | SORT dashboard.title | LIMIT 100'
   * ```
   */
  pipeline: string;

  /**
   * Optional METADATA fields to include on the auto-generated `FROM` clause.
   *
   * @example
   * ```
   * metadata: ['_id', '_source']
   * // generates: FROM .kibana METADATA _id, _source
   * ```
   */
  metadata?: string[];
}

/**
 * Response from the saved objects ES|QL query operation.
 */
export type SavedObjectsEsqlResponse = estypes.EsqlQueryResponse;
