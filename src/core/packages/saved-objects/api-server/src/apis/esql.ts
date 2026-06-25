/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ComposerQuery } from '@elastic/esql';

export type SavedObjectsEsqlUnmappedFields = 'default' | 'nullify' | 'load';

export interface SavedObjectsEsqlQuerySettings {
  /**
   * Optional ES|QL unmapped-fields resolution.
   *
   * `load` asks Elasticsearch to load unmapped values from `_source` and treat
   * fully unmapped fields as `keyword` columns. This is useful for simple
   * schema-on-read predicates and aggregations, but is subject to Elasticsearch
   * ES|QL `unmapped_fields` limitations.
   */
  unmappedFields?: SavedObjectsEsqlUnmappedFields;
}

/**
 * Options for the saved objects ES|QL query operation.
 *
 * This interface extends the Elasticsearch `EsqlQueryRequest` type, omitting fields that are
 * controlled server-side (`query`, `format`, `columnar`, `delimiter`), and adding saved-object-specific
 * options. The `FROM` clause is auto-generated from the `type` parameter via index resolution,
 * and security filters (namespace + type) are injected via the `filter` parameter.
 *
 * Consumers write only the ES|QL processing pipeline (everything after `FROM`), using the
 * `esql` tagged template from `@elastic/esql`.
 *
 * @remarks
 * **Security:** Template holes (`${{ name: value }}`) in the `esql` tag are automatically
 * promoted to ES|QL named parameters — values are forwarded to Elasticsearch at the protocol
 * level and never appear in the query string. Never pass user input via `esql.exp(userInput)`,
 * which injects a raw expression and bypasses parameterization entirely.
 *
 * Standalone encrypted scalar columns are always replaced with `null`. When `_source` is
 * present (via `metadata: ['_id', '_source']`), encrypted attributes within `_source` are
 * decrypted using the same path as `find` and `search`.
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
   * The ES|QL processing pipeline (everything after the `FROM` clause), built with the
   * `esql` tagged template from `@elastic/esql`. The `FROM` clause is auto-generated from
   * the `type` parameter.
   *
   * Template holes (`${{ name: value }}`) are promoted to named parameters — values are
   * sent to Elasticsearch at the protocol level, never interpolated into the query string.
   *
   * @example
   * ```ts
   * import { esql } from '@elastic/esql';
   *
   * pipeline: esql`
   *   WHERE dashboard.title LIKE ${{ title: searchTerm }}
   *   | LIMIT 100
   * `,
   * ```
   */
  pipeline: ComposerQuery;

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

  /**
   * Optional ES|QL query settings generated before the `FROM` clause.
   *
   * @example
   * ```
   * querySettings: { unmappedFields: 'load' }
   * // generates: SET unmapped_fields="load"; FROM .kibana ...
   * ```
   */
  querySettings?: SavedObjectsEsqlQuerySettings;
}

/**
 * Response from the saved objects ES|QL query operation.
 */
export type SavedObjectsEsqlResponse = estypes.EsqlQueryResponse;
