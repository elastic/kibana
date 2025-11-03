/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { History, Location } from 'history';
import { filter } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  createQueryParamObservable,
  getQueryParams,
  removeQueryParam,
  url,
} from '@kbn/kibana-utils-plugin/public';
import { stringify } from 'query-string';
import { SEARCH_SESSION_ID_QUERY_PARAM } from '../../../constants';

export interface DiscoverSearchSessionManagerDeps {
  history: History;
  session: DataPublicPluginStart['search']['session'];
}

/**
 * Helps with state management of search session and {@link SEARCH_SESSION_ID_QUERY_PARAM} in the URL
 */
export class DiscoverSearchSessionManager {
  private readonly deps: DiscoverSearchSessionManagerDeps;

  constructor(deps: DiscoverSearchSessionManagerDeps) {
    this.deps = deps;
  }

  /**
   * Notifies about `searchSessionId` changes in the URL,
   * skips if `searchSessionId` matches current search session id
   */
  getNewSearchSessionIdFromURL$() {
    return createQueryParamObservable<string>(
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
    return {
      searchSessionId: searchSessionIdFromURL ?? this.deps.session.start(),
      isSearchSessionRestored: Boolean(searchSessionIdFromURL),
    };
  }

  /**
   * Pushes the provided search session ID to the URL
   * @param searchSessionId - the search session ID to push to the URL
   */
  pushSearchSessionIdToURL(
    searchSessionId: string,
    { replace = true }: { replace?: boolean } = { replace: true }
  ) {
    const oldLocation = this.deps.history.location;
    const query = getQueryParams(oldLocation);

    query[SEARCH_SESSION_ID_QUERY_PARAM] = searchSessionId;

    const newSearch = stringify(url.encodeQuery(query), { sort: false, encode: false });
    const newLocation: Location = {
      ...oldLocation,
      search: newSearch,
    };

    if (replace) {
      this.deps.history.replace(newLocation);
    } else {
      this.deps.history.push(newLocation);
    }
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
