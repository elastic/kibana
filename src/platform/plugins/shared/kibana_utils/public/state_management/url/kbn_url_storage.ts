/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { format as formatUrl } from 'url';
import { stringify } from 'query-string';
import { createBrowserHistory, History } from 'history';
import { parseUrl, parseUrlHash } from '../../../common/state_management/parse';
import { decodeState } from '../state_encoder';
import { url as urlUtils } from '../../../common';
import {
  createSetStateToKbnUrl,
  SetStateToKbnUrlHashOptions,
} from '../../../common/state_management/set_state_to_kbn_url';
import { persistState } from '../state_hash';

export const getCurrentUrl = (history: History) => history.createHref(history.location);

/**
 * Parses a kibana url and retrieves all the states encoded into the URL,
 * Handles both expanded rison state and hashed state (where the actual state stored in sessionStorage)
 * e.g.:
 *
 * given an url:
 * http://localhost:5601/oxf/app/kibana#/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')
 * will return object:
 * {_a: {tab: 'indexedFields'}, _b: {f: 'test', i: '', l: ''}};
 *
 *
 * By default due to Kibana legacy reasons assumed that state is stored in a query inside a hash part of the URL:
 * http://localhost:5601/oxf/app/kibana#/yourApp?_a={STATE}
 *
 * { getFromHashQuery: false } option should be used in case state is stored in a main query (not in a hash):
 * http://localhost:5601/oxf/app/kibana?_a={STATE}#/yourApp
 *
 */
export function getStatesFromKbnUrl<State extends object = Record<string, unknown>>(
  url: string = window.location.href,
  keys?: Array<keyof State>,
  { getFromHashQuery = true }: { getFromHashQuery: boolean } = { getFromHashQuery: true }
): State {
  const query = getFromHashQuery ? parseUrlHash(url)?.query : parseUrl(url).query;

  if (!query) return {} as State;
  const decoded: Record<string, unknown> = {};
  Object.entries(query)
    .filter(([key]) => (keys ? keys.includes(key as keyof State) : true))
    .forEach(([q, value]) => {
      decoded[q] = decodeState(value as string);
    });

  return decoded as State;
}

/**
 * Retrieves specific state from url by key
 * e.g.:
 *
 * given an url:
 * http://localhost:5601/oxf/app/kibana#/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')
 * and key '_a'
 * will return object:
 * {tab: 'indexedFields'}
 *
 *
 * By default due to Kibana legacy reasons assumed that state is stored in a query inside a hash part of the URL:
 * http://localhost:5601/oxf/app/kibana#/yourApp?_a={STATE}
 *
 * { getFromHashQuery: false } option should be used in case state is stored in a main query (not in a hash):
 * http://localhost:5601/oxf/app/kibana?_a={STATE}#/yourApp
 */
export function getStateFromKbnUrl<State>(
  key: string,
  url: string = window.location.href,
  { getFromHashQuery = true }: { getFromHashQuery: boolean } = { getFromHashQuery: true }
): State | null {
  return (getStatesFromKbnUrl(url, [key], { getFromHashQuery })[key] as State) || null;
}

/**
 * Sets state to the url by key and returns a new url string.
 * Doesn't actually updates history
 *
 * e.g.:
 * given a url: http://localhost:5601/oxf/app/kibana#/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')
 * key: '_a'
 * and state: {tab: 'other'}
 *
 * will return url:
 * http://localhost:5601/oxf/app/kibana#/yourApp?_a=(tab:other)&_b=(f:test,i:'',l:'')
 *
 * By default due to Kibana legacy reasons assumed that state is stored in a query inside a hash part of the URL:
 * http://localhost:5601/oxf/app/kibana#/yourApp?_a={STATE}
 *
 * { storeInHashQuery: false } option should be used in you want to store your state in a main query (not in a hash):
 * http://localhost:5601/oxf/app/kibana?_a={STATE}#/yourApp
 */
export function setStateToKbnUrl<State>(
  key: string,
  state: State,
  { useHash = false, storeInHashQuery = true }: SetStateToKbnUrlHashOptions = {
    useHash: false,
    storeInHashQuery: true,
  },
  rawUrl = window.location.href
) {
  return internalSetStateToKbnUrl(key, state, { useHash, storeInHashQuery }, rawUrl);
}

const internalSetStateToKbnUrl = createSetStateToKbnUrl(persistState);

/**
 * A tiny wrapper around history library to listen for url changes and update url
 * History library handles a bunch of cross browser edge cases
 */
export interface IKbnUrlControls {
  /**
   * Listen for url changes
   * @param cb - called when url has been changed
   */
  listen: (cb: () => void) => () => void;

  /**
   * Updates url synchronously, if needed
   * skips the update and returns undefined in case when trying to update to current url
   * otherwise returns new url
   *
   * @param url - url to update to
   * @param replace - use replace instead of push
   */
  update: (url: string, replace: boolean) => string | undefined;

  /**
   * Schedules url update to next microtask,
   * Useful to batch sync changes to url to cause only one browser history update
   * @param updater - fn which receives current url and should return next url to update to
   * @param replace - use replace instead of push
   *
   */
  updateAsync: (updater: UrlUpdaterFnType, replace?: boolean) => Promise<string | undefined>;

  /**
   * If there is a pending url update - returns url that is scheduled for update
   */
  getPendingUrl: () => string | undefined;

  /**
   * Synchronously flushes scheduled url updates. Returns new flushed url, if there was an update. Otherwise - undefined.
   * @param replace - if replace passed in, then uses it instead of push. Otherwise push or replace is picked depending on updateQueue
   */
  flush: (replace?: boolean) => string | undefined;

  /**
   * Cancels any pending url updates
   */
  cancel: () => void;
}
export type UrlUpdaterFnType = (currentUrl: string) => string | undefined;

export const createKbnUrlControls = (
  history: History = createBrowserHistory()
): IKbnUrlControls => {
  const updateQueue: UrlUpdaterFnType[] = [];

  // if we should replace or push with next async update,
  // if any call in a queue asked to push, then we should push
  let shouldReplace = true;

  function updateUrl(newUrl: string, replace = false): string | undefined {
    const currentUrl = getCurrentUrl(history);
    if (newUrl === currentUrl) return undefined; // skip update

    const historyPath = getRelativeToHistoryPath(newUrl, history);

    if (replace) {
      history.replace(historyPath);
    } else {
      history.push(historyPath);
    }

    return getCurrentUrl(history);
  }

  // queue clean up
  function cleanUp() {
    updateQueue.splice(0, updateQueue.length);
    shouldReplace = true;
  }

  // runs scheduled url updates
  function flush(replace = shouldReplace) {
    if (updateQueue.length === 0) {
      return;
    }

    const nextUrl = getPendingUrl();
    cleanUp();
    const newUrl = updateUrl(nextUrl, replace);
    return newUrl;
  }

  function getPendingUrl() {
    const resultUrl = updateQueue.reduce(
      (url, nextUpdate) => nextUpdate(url) ?? url,
      getCurrentUrl(history)
    );

    return resultUrl;
  }

  return {
    listen: (cb: () => void) =>
      history.listen(() => {
        cb();
      }),
    update: (newUrl: string, replace = false) => updateUrl(newUrl, replace),
    updateAsync: (updater: UrlUpdaterFnType, replace = false) => {
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
    cancel: () => {
      cleanUp();
    },
    getPendingUrl: () => {
      return getPendingUrl();
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
  function stripBasename(path: string | null) {
    if (path === null) path = '';
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
    pathname: stripBasename(parsedUrl.pathname ?? null),
    // @ts-expect-error `urlUtils.encodeQuery` expects key/value pairs with values of type `string | string[] | null`,
    // however `@types/node` says that `url.query` has values of type `string | string[] | undefined`.
    // After investigating this, it seems that no matter what the values will be of type `string | string[]`
    search: stringify(urlUtils.encodeQuery(parsedUrl.query), { sort: false, encode: false }),
    hash: parsedHash
      ? formatUrl({
          pathname: parsedHash.pathname,
          // @ts-expect-error `urlUtils.encodeQuery` expects key/value pairs with values of type `string | string[] | null`,
          // however `@types/node` says that `url.query` has values of type `string | string[] | undefined`.
          // After investigating this, it seems that no matter what the values will be of type `string | string[]`
          search: stringify(urlUtils.encodeQuery(parsedHash.query), { sort: false, encode: false }),
        })
      : parsedUrl.hash,
  });
}
