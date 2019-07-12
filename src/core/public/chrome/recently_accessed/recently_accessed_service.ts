/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Observable } from 'rxjs';

import { PersistedLog } from './persisted_log';
import { createLogKey } from './create_log_key';
import { HttpSetup } from '../../http';

/** @public */
export interface ChromeRecentlyAccessedHistoryItem {
  link: string;
  label: string;
  id: string;
}

interface StartDeps {
  http: HttpSetup;
}

/** @internal */
export class RecentlyAccessedService {
  async start({ http }: StartDeps): Promise<ChromeRecentlyAccessed> {
    const logKey = await createLogKey('recentlyAccessed', http.basePath.get());
    const history = new PersistedLog<ChromeRecentlyAccessedHistoryItem>(logKey, {
      maxLength: 20,
      isEqual: (oldItem, newItem) => oldItem.id === newItem.id,
    });

    return {
      /** Adds a new item to the history. */
      add: (link: string, label: string, id: string) => {
        history.add({
          link,
          label,
          id,
        });
      },

      /** Gets the current array of history items. */
      get: () => history.get(),

      /** Gets an observable of the current array of history items. */
      get$: () => history.get$(),
    };
  }
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
   * @param id a unique string used to de-duplicate the recently accessed llist.
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
