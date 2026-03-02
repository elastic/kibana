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
 * This interface extends the Elasticsearch `EsqlQueryRequest` type, omitting index-related
 * fields that are controlled server-side, and adding saved-object-specific options.
 *
 * @remarks
 * **Security Warning:** The ES|QL query method provides low-level access to saved object data.
 * While the method injects namespace and type filters to enforce space-level security,
 * care must be taken when constructing queries:
 *
 * - The index is controlled server-side and cannot be overridden via the `FROM` clause.
 * - Use the `esql` tagged template from `@kbn/esql-language` or ES|QL params (`?` placeholders)
 *   to prevent injection attacks when interpolating user input into queries.
 * - Encrypted saved object attributes are stripped (replaced with `null`) in the response
 *   because AAD cannot be reliably reconstructed from tabular data.
 *
 * @public
 */
export interface SavedObjectsEsqlOptions
  extends Omit<estypes.EsqlQueryRequest, 'format' | 'columnar' | 'delimiter'> {
  /** The type or types of saved objects to query. */
  type: string | string[];

  /** The namespaces to query within. */
  namespaces: string[];
}

/**
 * Response from the saved objects ES|QL query operation.
 */
export type SavedObjectsEsqlResponse = estypes.EsqlQueryResponse;
