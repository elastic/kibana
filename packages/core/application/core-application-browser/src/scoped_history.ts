/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { History, LocationDescriptorObject, Href } from 'history';

/**
 * A wrapper around a `History` instance that is scoped to a particular base path of the history stack. Behaves
 * similarly to the `basename` option except that this wrapper hides any history stack entries from outside the scope
 * of this base path.
 *
 * This wrapper also allows Core and Plugins to share a single underlying global `History` instance without exposing
 * the history of other applications.
 *
 * The {@link ScopedHistory.createSubHistory | createSubHistory} method is particularly useful for applications that
 * contain any number of "sub-apps" which should not have access to the main application's history or basePath.
 *
 * @public
 */
export interface ScopedHistory<HistoryLocationState = unknown>
  extends History<HistoryLocationState> {
  /**
   * Creates a `ScopedHistory` for a subpath of this `ScopedHistory`. Useful for applications that may have sub-apps
   * that do not need access to the containing application's history.
   *
   * @param basePath the URL path scope for the sub history
   */
  createSubHistory(basePath: string): ScopedHistory;

  /**
   * Creates an href (string) to the location.
   * If `prependBasePath` is true (default), it will prepend the location's path with the scoped history basePath.
   *
   * @param location
   * @param options.prependBasePath
   */
  createHref(
    location: LocationDescriptorObject<HistoryLocationState>,
    options?: { prependBasePath?: boolean }
  ): Href;
}
