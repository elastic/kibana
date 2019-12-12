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

import { format as formatUrl, parse as _parseUrl } from 'url';
// @ts-ignore
import rison from 'rison-node';
// @ts-ignore
import encodeUriQuery from 'encode-uri-query';
import { createBrowserHistory } from 'history';
import { stringify as _stringifyQueryString, ParsedUrlQuery } from 'querystring';
import { BaseState } from '../store/sync';

// TODO: NP, Typescriptify, Simplify
import {
  createStateHash,
  isStateHash,
  HashedItemStoreSingleton,
} from '../../../../legacy/ui/public/state_management/state_storage';

const parseUrl = (url: string) => _parseUrl(url, true);
const parseUrlHash = (url: string) => parseUrl(parseUrl(url).hash!.slice(1));
const parseCurrentUrl = () => parseUrl(window.location.href);
const parseCurrentUrlHash = () => parseUrlHash(window.location.href);

// encodeUriQuery implements the less-aggressive encoding done naturally by
// the browser. We use it to generate the same urls the browser would
const stringifyQueryString = (query: ParsedUrlQuery) =>
  _stringifyQueryString(query, undefined, undefined, {
    encodeURIComponent: encodeUriQuery,
  });

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
export function getStatesFromUrl(url: string = window.location.href): Record<string, BaseState> {
  const { query } = parseUrlHash(url);

  const decoded: Record<string, BaseState> = {};
  try {
    Object.entries(query).forEach(([q, value]) => {
      if (isStateHash(value as string)) {
        decoded[q] = JSON.parse(HashedItemStoreSingleton.getItem(value)!);
      } else {
        decoded[q] = rison.decode(query[q]);
      }
    });
  } catch (e) {
    throw new Error('oops');
  }

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
// TODO: Optimize to not parse all the states if we need just one specific state by key
export function getStateFromUrl(key: string, url: string = window.location.href): BaseState {
  return getStatesFromUrl(url)[key] || null;
}

/**
 * Sets state to the url by key  and returns a new url string.
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
export function setStateToUrl<T extends BaseState>(
  key: string,
  state: T,
  { useHash = false }: { useHash: boolean } = { useHash: false },
  rawUrl = window.location.href
): string {
  const url = parseUrl(rawUrl);
  const hash = parseUrlHash(rawUrl);

  let encoded: string;
  if (useHash) {
    const stateJSON = JSON.stringify(state);
    const stateHash = createStateHash(stateJSON, (hashKey: string) =>
      HashedItemStoreSingleton.getItem(hashKey)
    );
    HashedItemStoreSingleton.setItem(stateHash, stateJSON);
    encoded = stateHash;
  } else {
    encoded = rison.encode(state);
  }

  const searchQueryString = stringifyQueryString({ ...hash.query, [key]: encoded });

  return formatUrl({
    ...url,
    hash: formatUrl({
      pathname: hash.pathname,
      search: searchQueryString,
    }),
  });
}

/**
 * A tiny wrapper around history library to listen for url changes and update url
 * History library handles a bunch of cross browser edge cases
 *
 * listen(cb) - accepts a callback which will be called whenever url has changed
 * update(url: string, replace: boolean) - get an absolute / relative url to update the location to
 */
export const createUrlControls = () => {
  const history = createBrowserHistory();
  return {
    listen: (cb: () => void) =>
      history.listen(() => {
        cb();
      }),
    update: (url: string, replace = false) => {
      const { pathname, search } = parseUrl(url);
      const parsedHash = parseUrlHash(url);
      const searchQueryString = stringifyQueryString(parsedHash.query);
      const location = {
        pathname,
        hash: formatUrl({
          pathname: parsedHash.pathname,
          search: searchQueryString,
        }),
        search,
      };
      if (replace) {
        history.replace(location);
      } else {
        history.push(location);
      }
    },
  };
};
