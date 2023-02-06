/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Options for the open point-in-time for type operation
 *
 * @public
 */
export interface SavedObjectsOpenPointInTimeOptions {
  /**
   * Optionally specify how long ES should keep the PIT alive until the next request. Defaults to `5m`.
   */
  keepAlive?: string;
  /**
   * An optional ES preference value to be used for the query.
   */
  preference?: string;
  /**
   * An optional list of namespaces to be used when opening the PIT.
   *
   * When the spaces plugin is enabled:
   *  - this will default to the user's current space (as determined by the URL)
   *  - if specified, the user's current space will be ignored
   *  - `['*']` will search across all available spaces
   */
  namespaces?: string[];
}

/**
 * Return type of the Saved Objects `openPointInTimeForType()` method.
 *
 * @public
 */
export interface SavedObjectsOpenPointInTimeResponse {
  /** PIT ID returned from ES */
  id: string;
}
