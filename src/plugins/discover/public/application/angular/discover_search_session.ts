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

import { History } from 'history';
import { filter } from 'rxjs/operators';
import { DataPublicPluginStart } from '../../../../data/public';
import {
  createQueryParamObservable,
  getQueryParams,
  removeQueryParam,
} from '../../../../kibana_utils/public';
import { SEARCH_SESSION_ID_QUERY_PARAM } from '../../url_generator';

export interface DiscoverSearchSessionManagerDeps {
  history: History;
  session: DataPublicPluginStart['search']['session'];
}

/**
 * Helps with state management of search session and {@link SEARCH_SESSION_ID_QUERY_PARAM} from the URL
 */
export class DiscoverSearchSessionManager {
  /**
   * Notifies about `searchSessionId` changes in the URL,
   * skips if `searchSessionId` matches current search session id
   */
  readonly newSearchSessionIdFromURL$ = createQueryParamObservable<string>(
    this.deps.history,
    SEARCH_SESSION_ID_QUERY_PARAM
  ).pipe(
    filter((searchSessionId) => {
      if (!searchSessionId) return true;
      return !this.deps.session.isCurrentSession(searchSessionId);
    })
  );

  constructor(private readonly deps: DiscoverSearchSessionManagerDeps) {}

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
    if (this.deps.history.location.search.includes(SEARCH_SESSION_ID_QUERY_PARAM)) {
      removeQueryParam(this.deps.history, SEARCH_SESSION_ID_QUERY_PARAM, replace);
    }
  }

  private getSearchSessionIdFromURL = () =>
    getQueryParams(this.deps.history.location)[SEARCH_SESSION_ID_QUERY_PARAM] as string | undefined;
}
