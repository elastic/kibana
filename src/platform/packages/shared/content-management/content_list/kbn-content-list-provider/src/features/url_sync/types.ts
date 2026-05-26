/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Parsed URL params after `query-string` parsing. */
export type ParsedQuery = Record<string, string | string[] | null | undefined>;

export interface UrlStateSlices {
  queryText?: string;
  sort?: { field: string; direction: 'asc' | 'desc' };
}

export interface HydratedUrlState {
  kind: 'new' | 'legacy' | 'empty';
  state: UrlStateSlices;
  consumed?: ReadonlyArray<string>;
}
