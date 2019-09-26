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

import encodeUriQuery from 'encode-uri-query';
import rison from 'rison-node';
import { parse as parseUrl, format as formatUrl } from 'url';
import { stringify as stringifyQuerystring } from 'querystring';

const conservativeStringifyQuerystring = (query) => {
  return stringifyQuerystring(query, null, null, {
    encodeURIComponent: encodeUriQuery
  });
};

const hashStateInQuery = (state, query) => {
  const name = state.getQueryParamName();
  const value = query[name];
  if (!value) {
    return { name, value };
  }

  const decodedValue = rison.decode(value);
  const hashedValue = state.toQueryParam(decodedValue);
  return { name, value: hashedValue };
};

const hashStatesInQuery = (states, query) => {
  const hashedQuery = states.reduce((result, state) => {
    const { name, value } = hashStateInQuery(state, query);
    if (value) {
      result[name] = value;
    }
    return result;
  }, {});


  return {
    ...query,
    ...hashedQuery
  };
};

export const hashUrl = (states, redirectUrl) => {
  // we need states to proceed, throwing an error if we don't have any
  if (states === null || !states.length) {
    throw new Error('states parameter must be an Array with length greater than 0');
  }

  const parsedUrl = parseUrl(redirectUrl);
  // if we don't have a hash, we return the redirectUrl without hashing anything
  if (!parsedUrl.hash) {
    return redirectUrl;
  }

  // The URLs that we use aren't "conventional" and the hash is sometimes appearing before
  // the querystring, even though conventionally they appear after it. The parsedUrl
  // is the entire URL, and the parsedAppUrl is everything after the hash.
  //
  // EXAMPLE
  // parsedUrl: /app/kibana#/visualize/edit/somelongguid?g=()&a=()
  // parsedAppUrl: /visualize/edit/somelongguid?g=()&a=()
  const parsedAppUrl = parseUrl(parsedUrl.hash.slice(1), true);

  // the parsedAppUrl actually has the query that we care about
  const query = parsedAppUrl.query;

  const newQuery = hashStatesInQuery(states, query);

  const newHash = formatUrl({
    search: conservativeStringifyQuerystring(newQuery),
    pathname: parsedAppUrl.pathname
  });

  return formatUrl({
    hash: `#${newHash}`,
    host: parsedUrl.host,
    search: parsedUrl.search,
    pathname: parsedUrl.pathname,
    protocol: parsedUrl.protocol,
  });
};
