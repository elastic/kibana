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

import { parse as parseUrl, format as formatUrl } from 'url';
// @ts-ignore
import rison from 'rison-node';
// @ts-ignore
import encodeUriQuery from 'encode-uri-query';
import { stringify as stringifyQueryString } from 'querystring';
import { BaseState } from '../store/sync';

const parseCurrentUrl = () => parseUrl(window.location.href, true);
const parseCurrentUrlHash = () => parseUrl(parseCurrentUrl().hash!.slice(1), true);

export function readStateUrl() {
  const { query } = parseCurrentUrlHash();

  const decoded: Record<string, any> = {};
  try {
    Object.keys(query).forEach(q => (decoded[q] = rison.decode(query[q])));
  } catch (e) {
    throw new Error('oops');
  }

  return decoded;
}

export function generateStateUrl<T extends BaseState>(state: T): string {
  const url = parseCurrentUrl();
  const hash = parseCurrentUrlHash();

  const encoded: Record<string, any> = {};
  try {
    Object.keys(state).forEach(s => (encoded[s] = rison.encode(state[s])));
  } catch (e) {
    throw new Error('oops');
  }

  // encodeUriQuery implements the less-aggressive encoding done naturally by
  // the browser. We use it to generate the same urls the browser would
  const searchQueryString = stringifyQueryString(encoded, undefined, undefined, {
    encodeURIComponent: encodeUriQuery,
  });

  return formatUrl({
    ...url,
    hash: formatUrl({
      pathname: hash.pathname,
      search: searchQueryString,
    }),
  });
}

export const updateHash = (url: string) => window.history.pushState({}, '', url);
