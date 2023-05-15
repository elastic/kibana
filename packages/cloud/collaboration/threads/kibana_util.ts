/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * THIS FILE IS A HACK.
 *
 * kibana_utils is a plugin instead of a package, which means its code is not available to
 * other packages.  So I had to copy relevant code here.
 *
 * We should move stateless code in kibana_util into packages.
 */
import { ParsedQuery, stringify } from 'query-string';
import { transform } from 'lodash';
import { format as formatUrl } from 'url';

import { parse as _parseUrl } from 'url';
import { Observable } from 'rxjs';
import { URLStorageState } from './flyout';

export interface IKbnUrlStateStorage {
  set: (
    key: string,
    state: URLStorageState,
    opts?: { replace: boolean }
  ) => Promise<string | undefined>;
  get: (key: string) => URLStorageState | null;
  change$: (key: string) => Observable<URLStorageState | null>;
  kbnUrlControls: {
    update: (url: string, replace: boolean) => string | undefined;
  };
}

export const parseUrl = (url: string) => _parseUrl(url, true);

export const parseUrlHash = (url: string) => {
  const hash = parseUrl(url).hash;
  return hash ? parseUrl(hash.slice(1)) : null;
};

export function replaceUrlHashQuery(
  rawUrl: string,
  queryReplacer: (query: ParsedQuery) => ParsedQuery
) {
  const url = parseUrl(rawUrl);
  const hash = parseUrlHash(rawUrl);
  // @ts-expect-error `queryReplacer` expects key/value pairs with values of type `string | string[] | null`,
  // however `@types/node` says that `url.query` has values of type `string | string[] | undefined`.
  // After investigating this, it seems that no matter what the values will be of type `string | string[]`
  const newQuery = queryReplacer(hash?.query || {});
  const searchQueryString = stringify(urlUtils.encodeQuery(newQuery), {
    sort: false,
    encode: false,
  });

  if ((!hash || !hash.search) && !searchQueryString) return rawUrl; // nothing to change. return original url
  return formatUrl({
    ...url,
    hash: formatUrl({
      pathname: hash?.pathname || '',
      search: searchQueryString,
    }),
  });
}

export function encodeUriQuery(val: string, pctEncodeSpaces = false) {
  return encodeURIComponent(val)
    .replace(/%40/gi, '@')
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%20/g, pctEncodeSpaces ? '%20' : '+');
}

export const encodeQuery = (
  query: ParsedQuery,
  encodeFunction: (val: string, pctEncodeSpaces?: boolean) => string = encodeUriQuery,
  pctEncodeSpaces = true
): ParsedQuery =>
  transform<any, ParsedQuery>(query, (result, value, key) => {
    if (key) {
      const singleValue = Array.isArray(value) ? value.join(',') : value;

      result[key] = encodeFunction(
        singleValue === undefined || singleValue === null ? '' : singleValue,
        pctEncodeSpaces
      );
    }
  });

const urlUtils = {
  encodeQuery,
};
