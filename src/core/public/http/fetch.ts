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

import { merge } from 'lodash';
import { format } from 'url';

import { HttpFetchOptions, HttpBody, Deps } from './types';
import { HttpFetchError } from './http_fetch_error';

const JSON_CONTENT = /^(application\/(json|x-javascript)|text\/(x-)?javascript|x-json)(;.*)?$/;
const NDJSON_CONTENT = /^(application\/ndjson)(;.*)?$/;

export const setup = ({ basePath, injectedMetadata }: Deps) => {
  async function fetch(path: string, options: HttpFetchOptions = {}): Promise<HttpBody> {
    const { query, prependBasePath, ...fetchOptions } = merge(
      {
        method: 'GET',
        credentials: 'same-origin',
        prependBasePath: true,
        headers: {
          'kbn-version': injectedMetadata.getKibanaVersion(),
          'Content-Type': 'application/json',
        },
      },
      options
    );
    const url = format({
      pathname: prependBasePath ? basePath.addToPath(path) : path,
      query,
    });

    if (
      options.headers &&
      'Content-Type' in options.headers &&
      options.headers['Content-Type'] === undefined
    ) {
      delete fetchOptions.headers['Content-Type'];
    }

    let response;
    let body = null;

    try {
      response = await window.fetch(url, fetchOptions as RequestInit);
    } catch (err) {
      throw new HttpFetchError(err.message);
    }

    const contentType = response.headers.get('Content-Type') || '';

    try {
      if (NDJSON_CONTENT.test(contentType)) {
        body = await response.blob();
      } else if (JSON_CONTENT.test(contentType)) {
        body = await response.json();
      } else {
        body = await response.text();
      }
    } catch (err) {
      throw new HttpFetchError(err.message, response, body);
    }

    if (!response.ok) {
      throw new HttpFetchError(response.statusText, response, body);
    }

    return body;
  }

  function shorthand(method: string) {
    return (path: string, options: HttpFetchOptions = {}) => fetch(path, { ...options, method });
  }

  return { fetch, shorthand };
};
