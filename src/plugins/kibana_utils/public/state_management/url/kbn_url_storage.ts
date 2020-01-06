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

import { format as formatUrl } from 'url';
import { createBrowserHistory, History } from 'history';
import { decodeState, encodeState } from '../state_encoder';
import { getCurrentUrl, parseUrl, parseUrlHash } from './parse';
import { stringifyQueryString } from './stringify_query_string';
import { replaceUrlHashQuery } from './format';

/**
 * Parses a kibana url and retrieves all the states encoded into url,
 * Handles both expanded rison state and hashed state (where the actual state stored in sessionStorage)
 * e.g.:
 *
 * given an url:
 * http://localhost:5601/oxf/app/kibana#/management/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')
 * will return object:
 * {_a: {tab: 'indexedFields'}, _b: {f: 'test', i: '', l: ''}};
 */
export function getStatesFromKbnUrl(
  url: string = window.location.href,
  keys?: string[]
): Record<string, unknown> {
  const query = parseUrlHash(url)?.query;

  if (!query) return {};
  const decoded: Record<string, unknown> = {};
  Object.entries(query)
    .filter(([key]) => (keys ? keys.includes(key) : true))
    .forEach(([q, value]) => {
      decoded[q] = decodeState(value as string);
    });

  return decoded;
}

/**
 * Retrieves specific state from url by key
 * e.g.:
 *
 * given an url:
 * http://localhost:5601/oxf/app/kibana#/management/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')
 * and key '_a'
 * will return object:
 * {tab: 'indexedFields'}
 */
export function getStateFromKbnUrl<State>(
  key: string,
  url: string = window.location.href
): State | null {
  return (getStatesFromKbnUrl(url, [key])[key] as State) || null;
}

/**
 * Sets state to the url by key and returns a new url string.
 * Doesn't actually updates history
 *
 * e.g.:
 * given a url: http://localhost:5601/oxf/app/kibana#/management/kibana/index_patterns/id?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')
 * key: '_a'
 * and state: {tab: 'other'}
 *
 * will return url:
 * http://localhost:5601/oxf/app/kibana#/management/kibana/index_patterns/id?_a=(tab:other)&_b=(f:test,i:'',l:'')
 */
export function setStateToKbnUrl<State>(
  key: string,
  state: State,
  { useHash = false }: { useHash: boolean } = { useHash: false },
  rawUrl = window.location.href
): string {
  return replaceUrlHashQuery(rawUrl, query => {
    const encoded = encodeState(state, useHash);
    return {
      ...query,
      [key]: encoded,
    };
  });
}

/**
 * A tiny wrapper around history library to listen for url changes and update url
 * History library handles a bunch of cross browser edge cases
 */
export interface IKbnUrlControls {
  /**
   * Listen for url changes
   * @param cb - get's called when url has been changed
   */
  listen: (cb: () => void) => () => void;

  /**
   * Updates url synchronously
   * @param url - url to update to
   * @param replace - use replace instead of push
   */
  update: (url: string, replace: boolean) => string;

  /**
   * Schedules url update to next microtask,
   * Useful to batch sync changes to url to cause only one browser history update
   * @param updater - fn which receives current url and should return next url to update to
   * @param replace - use replace instead of push
   */
  updateAsync: (updater: UrlUpdaterFnType, replace?: boolean) => Promise<string>;

  /**
   * Synchronously Flushes scheduled url updates
   * @param replace - if replace passed in, then uses it instead of push. Otherwise push or replace is picked depending on updateQueue
   */
  flush: (replace?: boolean) => string;
}
export type UrlUpdaterFnType = (currentUrl: string) => string;

export const createKbnUrlControls = (
  history: History = createBrowserHistory()
): IKbnUrlControls => {
  const updateQueue: Array<(currentUrl: string) => string> = [];

  // if we should replace or push with next async update,
  // if any call in a queue asked to push, then we should push
  let shouldReplace = true;

  function updateUrl(newUrl: string, replace = false): string {
    const currentUrl = getCurrentUrl();
    if (newUrl === currentUrl) return currentUrl; // skip update

    const historyPath = getRelativeToHistoryPath(newUrl, history);

    if (replace) {
      history.replace(historyPath);
    } else {
      history.push(historyPath);
    }

    return getCurrentUrl();
  }

  function flush(replace = shouldReplace) {
    if (updateQueue.length === 0) return getCurrentUrl();
    const resultUrl = updateQueue.reduce((url, nextUpdate) => nextUpdate(url), getCurrentUrl());
    const newUrl = updateUrl(resultUrl, replace);
    // queue clean up
    updateQueue.splice(0, updateQueue.length);
    shouldReplace = true;

    return newUrl;
  }

  return {
    listen: (cb: () => void) =>
      history.listen(() => {
        cb();
      }),
    update: (newUrl: string, replace = false) => updateUrl(newUrl, replace),
    updateAsync: (updater: (currentUrl: string) => string, replace = false) => {
      updateQueue.push(updater);
      if (shouldReplace) {
        shouldReplace = replace;
      }

      // Schedule url update to the next microtask
      // this allows to batch synchronous url changes
      return Promise.resolve().then(() => {
        return flush();
      });
    },
    flush: (replace?: boolean) => {
      return flush(replace);
    },
  };
};

/**
 * Depending on history configuration extracts relative path for history updates
 * 4 possible cases (see tests):
 * 1. Browser history with empty base path
 * 2. Browser history with base path
 * 3. Hash history with empty base path
 * 4. Hash history with base path
 */
export function getRelativeToHistoryPath(absoluteUrl: string, history: History): History.Path {
  function stripBasename(path: string = '') {
    const stripLeadingHash = (_: string) => (_.charAt(0) === '#' ? _.substr(1) : _);
    const stripTrailingSlash = (_: string) =>
      _.charAt(_.length - 1) === '/' ? _.substr(0, _.length - 1) : _;
    const baseName = stripLeadingHash(stripTrailingSlash(history.createHref({})));
    return path.startsWith(baseName) ? path.substr(baseName.length) : path;
  }
  const isHashHistory = history.createHref({}).includes('#');
  const parsedUrl = isHashHistory ? parseUrlHash(absoluteUrl)! : parseUrl(absoluteUrl);
  const parsedHash = isHashHistory ? null : parseUrlHash(absoluteUrl);

  return formatUrl({
    pathname: stripBasename(parsedUrl.pathname),
    search: stringifyQueryString(parsedUrl.query),
    hash: parsedHash
      ? formatUrl({
          pathname: parsedHash.pathname,
          search: stringifyQueryString(parsedHash.query),
        })
      : parsedUrl.hash,
  });
}
