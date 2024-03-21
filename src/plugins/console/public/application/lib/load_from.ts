/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import qs from 'query-string';
import { compressToEncodedURIComponent } from 'lz-string';

function getBaseUrl() {
  return `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
}
function parseQueryString() {
  const [hashRoute, queryString] = (window.location.hash || window.location.search || '').split(
    '?'
  );

  const parsedQueryString = qs.parse(queryString || '', { sort: false });
  return {
    hasHash: !!window.location.hash,
    hashRoute,
    queryString: parsedQueryString,
  };
}

export const setLoadFromParameter = (value: string) => {
  const baseUrl = getBaseUrl();
  const { hasHash, hashRoute, queryString } = parseQueryString();
  const consoleDataUri = compressToEncodedURIComponent(value);
  queryString.load_from = `data:text/plain,${consoleDataUri}`;
  const params = `?${qs.stringify(queryString)}`;
  const newUrl = hasHash ? `${baseUrl}${hashRoute}${params}` : `${baseUrl}${params}`;

  window.history.pushState({ path: newUrl }, '', newUrl);
};

export const removeLoadFromParameter = () => {
  const baseUrl = getBaseUrl();
  const { hasHash, hashRoute, queryString } = parseQueryString();
  if (queryString.load_from) {
    delete queryString.load_from;

    const params = Object.keys(queryString).length ? `?${qs.stringify(queryString)}` : '';
    const newUrl = hasHash ? `${baseUrl}${hashRoute}${params}` : `${baseUrl}${params}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  }
};
