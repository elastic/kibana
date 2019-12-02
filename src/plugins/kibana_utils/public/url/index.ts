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

export function getStateFromUrl(key: string, url: string = window.location.href): BaseState {
  return getStatesFromUrl(url)[key] || null;
}

export function setStateToUrl<T extends BaseState>(
  key: string,
  state: T,
  { useHash = false }: { useHash: boolean } = { useHash: false }
): string {
  const url = parseCurrentUrl();
  const hash = parseCurrentUrlHash();

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
