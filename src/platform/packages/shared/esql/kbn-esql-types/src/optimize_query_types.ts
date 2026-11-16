/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** What the optimize query route answers with. */
export interface OptimizeQueryResponse {
  /** A faster query that should return the same results, or null when no safe one was found. */
  query: string | null;
  /** Why the query is faster, or why no safe improvement was found. */
  reason: string;
}
