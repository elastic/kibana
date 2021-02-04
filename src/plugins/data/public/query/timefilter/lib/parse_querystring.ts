/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse } from 'query-string';

/** @internal */
export function parseQueryString() {
  // window.location.search is an empty string
  // get search from href
  const hrefSplit = window.location.href.split('?');
  if (hrefSplit.length <= 1) {
    return {};
  }

  return parse(hrefSplit[1], { sort: false });
}
