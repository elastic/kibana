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

import {
  parse as parseUrl,
  format as formatUrl,
} from 'url';

import encodeUriQuery from 'encode-uri-query';

import {
  stringify as stringifyQueryString
} from 'querystring';

import { unhashQueryString } from './unhash_query_string';

export function unhashUrl(urlWithHashes, states) {
  if (!urlWithHashes) return urlWithHashes;

  const urlWithHashesParsed = parseUrl(urlWithHashes, true);
  if (!urlWithHashesParsed.hostname) {
    // passing a url like "localhost:5601" or "/app/kibana" should be prevented
    throw new TypeError(
      'Only absolute urls should be passed to `unhashUrl()`. ' +
      'Unable to detect url hostname.'
    );
  }

  if (!urlWithHashesParsed.hash) return urlWithHashes;

  const appUrl = urlWithHashesParsed.hash.slice(1); // trim the #
  if (!appUrl) return urlWithHashes;

  const appUrlParsed = parseUrl(urlWithHashesParsed.hash.slice(1), true);
  if (!appUrlParsed.query) return urlWithHashes;

  const appQueryWithoutHashes = unhashQueryString(appUrlParsed.query || {}, states);

  // encodeUriQuery implements the less-aggressive encoding done naturally by
  // the browser. We use it to generate the same urls the browser would
  const appQueryStringWithoutHashes = stringifyQueryString(appQueryWithoutHashes, null, null, {
    encodeURIComponent: encodeUriQuery
  });

  return formatUrl({
    ...urlWithHashesParsed,
    hash: formatUrl({
      pathname: appUrlParsed.pathname,
      search: appQueryStringWithoutHashes,
    })
  });
}
