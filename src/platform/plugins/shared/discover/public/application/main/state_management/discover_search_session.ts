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
import queryString from 'query-string';
import { SEARCH_SESSION_ID_QUERY_PARAM } from '../../../constants';

export interface DiscoverSearchSessionManagerDeps {
  history: History;
  session: DataPublicPluginStart['search']['session'];
  replayCache: DataPublicPluginStart['replayCache'];
  /**
   * Starting a session moves "now" forward, so we read the time range right after the start.
   * Read it earlier and `now-15m` would still be based on the previous session's "now".
   */
  timefilter: DataPublicPluginStart['query']['timefilter']['timefilter'];
}

/**
 * Picks the search session for Discover: it restores the one in the URL, replays the cached
 * session of a tab when you come back to it, or starts a new one.
 */
export class DiscoverSearchSessionManager {
  private readonly deps: DiscoverSearchSessionManagerDeps;
  private readonly replayedSessionIdByTabId = new Map<string, string>();

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
   * Gets the session of a tab fetch and caches it, replaying the cached one on an initial load with the same context key
   */
  getTabSearchSession({
    tabId,
    initial,
    contextKey,
  }: {
    tabId: string;
    initial: boolean;
    contextKey: string;
  }) {
    const { replayCache, session, timefilter } = this.deps;
    const assetId = getReplayCacheAssetId(tabId);

    if (initial && !this.hasSearchSessionIdInURL()) {
      const replay = replayCache.get(assetId, contextKey);

      if (replay.hit) {
        if (!session.isCurrentSession(replay.sessionId)) {
          session.continue(replay.sessionId);
        }

        this.replayedSessionIdByTabId.set(tabId, replay.sessionId);

        return {
          searchSessionId: replay.sessionId,
          isSearchSessionRestored: false,
          timeRangeAbsolute: replay.timeRange,
        };
      }
    }

    this.replayedSessionIdByTabId.delete(tabId);

    const { searchSessionId, isSearchSessionRestored } = this.getNextSearchSessionId();
    const timeRangeAbsolute = timefilter.getAbsoluteTime();

    if (!isSearchSessionRestored) {
      replayCache.set(assetId, {
        sessionId: searchSessionId,
        timeRange: { ...timeRangeAbsolute, mode: 'absolute' },
        contextKey,
      });
    } else {
      replayCache.delete(assetId);
    }

    return { searchSessionId, isSearchSessionRestored, timeRangeAbsolute };
  }

  /**
   * Discards the cached session of a tab
   */
  forgetTab(tabId: string) {
    this.replayedSessionIdByTabId.delete(tabId);
    this.deps.replayCache.delete(getReplayCacheAssetId(tabId));
  }

  /**
   * If the current search session was replayed from the cache by any tab
   */
  isCurrentSessionReplayed(): boolean {
    const { replayedSessionIdByTabId, deps } = this;

    return [...replayedSessionIdByTabId.values()].some((sessionId) =>
      deps.session.isCurrentSession(sessionId)
    );
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

    const newSearch = queryString.stringify(url.encodeQuery(query), { sort: false, encode: false });
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

const getReplayCacheAssetId = (tabId: string) => `discover:${tabId}`;
