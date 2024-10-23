/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { RecentlyAccessed, RecentlyAccessedHistoryItem } from './types';
import { PersistedLog } from './persisted_log';
import { createLogKey } from './create_log_key';

interface StartDeps {
  key: string;
  http: Pick<HttpStart, 'basePath'>;
}

export class RecentlyAccessedService {
  start({ http, key }: StartDeps): RecentlyAccessed {
    const logKey = createLogKey(key, http.basePath.get());
    const history = new PersistedLog<RecentlyAccessedHistoryItem>(logKey, {
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
