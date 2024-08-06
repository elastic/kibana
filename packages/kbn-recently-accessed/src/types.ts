/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';

/** @public */
export interface RecentlyAccessedHistoryItem {
  link: string;
  label: string;
  id: string;
}

/**
 * {@link RecentlyAccessed | APIs} for recently accessed history.
 * @public
 */
export interface RecentlyAccessed {
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
   * recentlyAccessed.get().forEach(console.log);
   * ```
   */
  get(): RecentlyAccessedHistoryItem[];

  /**
   * Gets an Observable of the array of recently accessed history.
   *
   * @example
   * ```js
   * recentlyAccessed.get$().subscribe(console.log);
   * ```
   */
  get$(): Observable<RecentlyAccessedHistoryItem[]>;
}
