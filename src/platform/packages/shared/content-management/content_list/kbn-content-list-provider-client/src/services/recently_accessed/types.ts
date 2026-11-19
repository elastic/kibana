/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Minimal entry shape needed to compute recency. Compatible with
 * `RecentlyAccessedHistoryItem` from `@kbn/recently-accessed`.
 */
export interface RecentlyAccessedEntry {
  id: string;
}

/**
 * Minimal source contract — anything that can return a most-recent-first
 * list of `{ id }` entries. Compatible with `RecentlyAccessed` from
 * `@kbn/recently-accessed` (consumers typically pass that directly).
 */
export interface RecentlyAccessedHistorySource<
  Entry extends RecentlyAccessedEntry = RecentlyAccessedEntry
> {
  /** Returns the current most-recent-first list of entries. */
  get(): Entry[];
}
