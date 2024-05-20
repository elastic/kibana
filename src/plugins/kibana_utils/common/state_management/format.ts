/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ParsedQuery, stringify } from 'query-string';
import { format as formatUrl } from 'url';
import { parseUrl, parseUrlHash } from './parse';
import { url as urlUtils } from '..';

export function replaceUrlQuery(
  rawUrl: string,
  queryReplacer: (query: ParsedQuery) => ParsedQuery
) {
  const url = parseUrl(rawUrl);
  // @ts-expect-error `queryReplacer` expects key/value pairs with values of type `string | string[] | null`,
  // however `@types/node` says that `url.query` has values of type `string | string[] | undefined`.
  // After investigating this, it seems that no matter what the values will be of type `string | string[]`
  const newQuery = queryReplacer(url.query || {});
  const searchQueryString = stringify(urlUtils.encodeQuery(newQuery), {
    sort: false,
    encode: false,
  });
  if (!url.search && !searchQueryString) return rawUrl; // nothing to change. return original url
  return formatUrl({
    ...url,
    search: searchQueryString,
  });
}

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
