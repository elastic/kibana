/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History, LocationDescriptorObject, Href } from 'history';

export interface IScopedHistory<HistoryLocationState = unknown>
  extends History<HistoryLocationState> {
  /**
   * Creates a `ScopedHistory` for a subpath of this `ScopedHistory`. Useful for applications that may have sub-apps
   * that do not need access to the containing application's history.
   *
   * @param basePath the URL path scope for the sub history
   */
  createSubHistory(basePath: string): IScopedHistory;

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
