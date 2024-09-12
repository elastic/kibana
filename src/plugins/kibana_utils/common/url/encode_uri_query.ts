/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ParsedQuery, parse, stringify } from 'query-string';
import { transform } from 'lodash';

/**
 * This method is intended for encoding *key* or *value* parts of query component. We need a custom
 * method because encodeURIComponent is too aggressive and encodes stuff that doesn't have to be
 * encoded per http://tools.ietf.org/html/rfc3986:
 *    query         = *( pchar / "/" / "?" )
 *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
 *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
 *    pct-encoded   = "%" HEXDIG HEXDIG
 *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
 *                     / "*" / "+" / "," / ";" / "="
 */
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

/**
 * Method to help modify url query params.
 *
 * @param params
 * @param key
 * @param value
 */
export const addQueryParam = (params: string, key: string, value?: string) => {
  const queryParams = parse(params);

  if (value !== undefined) {
    queryParams[key] = value;
  } else {
    delete queryParams[key];
  }

  return stringify(encodeQuery(queryParams, undefined, false), {
    sort: false,
    encode: false,
  });
};
