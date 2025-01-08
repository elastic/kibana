/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

/** @public */
export interface ChromeRecentlyAccessedHistoryItem {
  link: string;
  label: string;
  id: string;
}

/**
 * {@link ChromeRecentlyAccessed | APIs} for recently accessed history.
 * @public
 */
export interface ChromeRecentlyAccessed {
  /**
   * Adds a new item to the recently accessed history.
   *
   * @example
   * ```js
   * chrome.recentlyAccessed.add('/app/map/1234', 'Map 1234', '1234');
   * ```
   *
   * @param link a relative URL to the resource (not including the {@link HttpStart.basePath | `http.basePath`})
   * @param label the label to display in the UI
   * @param id a unique string used to de-duplicate the recently accessed list.
   */
  add(link: string, label: string, id: string): void;

  /**
   * Gets an Array of the current recently accessed history.
   *
   * @example
   * ```js
   * chrome.recentlyAccessed.get().forEach(console.log);
   * ```
   */
  get(): ChromeRecentlyAccessedHistoryItem[];

  /**
   * Gets an Observable of the array of recently accessed history.
   *
   * @example
   * ```js
   * chrome.recentlyAccessed.get$().subscribe(console.log);
   * ```
   */
  get$(): Observable<ChromeRecentlyAccessedHistoryItem[]>;
}
