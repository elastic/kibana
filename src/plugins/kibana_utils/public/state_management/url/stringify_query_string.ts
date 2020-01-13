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

import { stringify, ParsedUrlQuery } from 'querystring';

// encodeUriQuery implements the less-aggressive encoding done naturally by
// the browser. We use it to generate the same urls the browser would
export const stringifyQueryString = (query: ParsedUrlQuery) =>
  stringify(query, undefined, undefined, {
    // encode spaces with %20 is needed to produce the same queries as angular does
    // https://github.com/angular/angular.js/blob/51c516e7d4f2d10b0aaa4487bd0b52772022207a/src/Angular.js#L1377
    encodeURIComponent: (val: string) => encodeUriQuery(val, true),
  });

/**
 *  Extracted from angular.js
 *  repo: https://github.com/angular/angular.js
 *  license: MIT - https://github.com/angular/angular.js/blob/51c516e7d4f2d10b0aaa4487bd0b52772022207a/LICENSE
 *  source: https://github.com/angular/angular.js/blob/51c516e7d4f2d10b0aaa4487bd0b52772022207a/src/Angular.js#L1413-L1432
 */

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
export function encodeUriQuery(val: string, pctEncodeSpaces: boolean = false) {
  return encodeURIComponent(val)
    .replace(/%40/gi, '@')
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%20/g, pctEncodeSpaces ? '%20' : '+');
}
