/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  ChromeRecentlyAccessed,
  ChromeRecentlyAccessedHistoryItem,
} from '@kbn/core-chrome-browser';
import { PersistedLog } from './persisted_log';
import { createLogKey } from './create_log_key';

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
