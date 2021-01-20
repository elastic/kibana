/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { parse, ParsedQuery } from 'query-string';

export function extractQueryParams(queryString: string = ''): ParsedQuery<string> {
  const hrefSplit = queryString.split('?');
  if (!hrefSplit.length) {
    return {};
  }

  return parse(hrefSplit[1], { sort: false });
}
