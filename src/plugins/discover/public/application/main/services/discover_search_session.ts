/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History } from 'history';
import * as Rx from 'rxjs';
import { filter } from 'rxjs/operators';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  createQueryParamObservable,
  getQueryParams,
  removeQueryParam,
} from '@kbn/kibana-utils-plugin/public';
import { SEARCH_SESSION_ID_QUERY_PARAM } from '../../../constants';

export interface DiscoverSearchSessionManagerDeps {
  history: History;
  session: DataPublicPluginStart['search']['session'];
}

/**
 * Helps with state management of search session and {@link SEARCH_SESSION_ID_QUERY_PARAM} in the URL
 */
export class DiscoverSearchSessionManager {
  /**
   * Notifies about `searchSessionId` changes in the URL,
   * skips if `searchSessionId` matches current search session id
   */
  readonly newSearchSessionIdFromURL$: Rx.Observable<string | null>;
  private readonly deps: DiscoverSearchSessionManagerDeps;

  constructor(deps: DiscoverSearchSessionManagerDeps) {
    this.deps = deps;
    this.newSearchSessionIdFromURL$ = createQueryParamObservable<string>(
      this.deps.history,
      SEARCH_SESSION_ID_QUERY_PARAM
    ).pipe(
      filter((searchSessionId) => {
        if (!searchSessionId) return true;
        return !this.deps.session.isCurrentSession(searchSessionId);
      })
    );
  }

  /**
   * Get next session id by either starting or restoring a session.
   * When navigating away from the restored session {@link SEARCH_SESSION_ID_QUERY_PARAM} is removed from the URL using history.replace
   */
  getNextSearchSessionId() {
    let searchSessionIdFromURL = this.getSearchSessionIdFromURL();
    if (searchSessionIdFromURL) {
      if (
        this.deps.session.isRestore() &&
        this.deps.session.isCurrentSession(searchSessionIdFromURL)
      ) {
        // navigating away from a restored session
        this.removeSearchSessionIdFromURL({ replace: true });
        searchSessionIdFromURL = undefined;
      } else {
        this.deps.session.restore(searchSessionIdFromURL);
      }
    }

    return searchSessionIdFromURL ?? this.deps.session.start();
  }

  /**
   * Removes Discovers {@link SEARCH_SESSION_ID_QUERY_PARAM} from the URL
   * @param replace - methods to change the URL
   */
  removeSearchSessionIdFromURL({ replace = true }: { replace?: boolean } = { replace: true }) {
    if (this.hasSearchSessionIdInURL()) {
      removeQueryParam(this.deps.history, SEARCH_SESSION_ID_QUERY_PARAM, replace);
    }
  }

  /**
   * If there is a {@link SEARCH_SESSION_ID_QUERY_PARAM} currently in the URL
   */
  hasSearchSessionIdInURL(): boolean {
    return !!this.getSearchSessionIdFromURL();
  }

  private getSearchSessionIdFromURL = () =>
    getQueryParams(this.deps.history.location)[SEARCH_SESSION_ID_QUERY_PARAM] as string | undefined;
}
