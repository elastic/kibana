/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { parse } from 'query-string';

/** @internal */
export function getForceNowFromUrl(): Date | undefined {
  const forceNow = parseQueryString().forceNow as string;
  if (!forceNow) {
    return;
  }

  const ts = Date.parse(forceNow);
  if (isNaN(ts)) {
    throw new Error(`forceNow query parameter, ${forceNow}, can't be parsed by Date.parse`);
  }
  return new Date(ts);
}

/** @internal */
function parseQueryString() {
  // window.location.search is an empty string
  // get search from href
  const hrefSplit = window.location.href.split('?');
  if (hrefSplit.length <= 1) {
    return {};
  }

  return parse(hrefSplit[1], { sort: false });
}
