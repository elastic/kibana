/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createHashHistory, History } from 'history';
import { HistoryLocationState } from './build_services';

export class HistoryService {
  private history?: History<HistoryLocationState>;

  /**
   * Makes sure discover and context are using one instance of history.
   */
  getHistory() {
    if (!this.history) {
      this.history = createHashHistory<HistoryLocationState>();
      this.history.listen(() => {
        // keep at least one listener so that `history.location` always in sync
      });
    }

    return this.history;
  }

  /**
   * Discover currently uses two `history` instances: one from Kibana Platform and
   * another from `history` package. Below function is used every time Discover
   * app is loaded to synchronize both instances.
   *
   * This helper is temporary until https://github.com/elastic/kibana/issues/65161 is resolved.
   */
  syncHistoryLocations() {
    const history = this.getHistory();
    Object.assign(history.location, createHashHistory().location);
    return history;
  }
}
