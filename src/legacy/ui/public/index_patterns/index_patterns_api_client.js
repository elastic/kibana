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

import { resolve as resolveUrl, format as formatUrl } from 'url';

import { pick, mapValues } from 'lodash';

import { IndexPatternMissingIndices } from '../errors';

export function createIndexPatternsApiClient($http, basePath) {
  const apiBaseUrl = `${basePath}/api/index_patterns/`;

  function join(...uriComponents) {
    return uriComponents.filter(Boolean).map(encodeURIComponent).join('/');
  }

  function getUrl(path, query) {
    const noNullsQuery = pick(query, value => value != null);
    const noArraysQuery = mapValues(noNullsQuery, value => (
      Array.isArray(value) ? JSON.stringify(value) : value
    ));

    return resolveUrl(apiBaseUrl, formatUrl({
      pathname: join(...path),
      query: noArraysQuery,
    }));
  }

  function request(method, url, body) {
    return $http({
      method,
      url,
      data: body,
    })
      .then(resp => resp.data)
      .catch((resp) => {
      // convert $http errors into actual error objects
        const respBody = resp.data;

        if (resp.status === 404 && respBody.code === 'no_matching_indices') {
          throw new IndexPatternMissingIndices(respBody.message);
        }

        const err = new Error(respBody.message || respBody.error || `${resp.status} Response`);
        err.status = resp.status;
        err.body = respBody;
        throw err;
      });
  }

  class IndexPatternsApiClient {
    getFieldsForTimePattern(options = {}) {
      const {
        pattern,
        lookBack,
        metaFields,
      } = options;

      const url = getUrl(['_fields_for_time_pattern'], {
        pattern,
        look_back: lookBack,
        meta_fields: metaFields,
      });

      return request('GET', url).then(resp => resp.fields);
    }

    getFieldsForWildcard(options = {}) {
      const {
        pattern,
        metaFields,
        type,
        params,
      } = options;

      let url;

      if(type) {
        url = getUrl([type, '_fields_for_wildcard'], {
          pattern,
          meta_fields: metaFields,
          params: JSON.stringify(params),
        });
      } else {
        url = getUrl(['_fields_for_wildcard'], {
          pattern,
          meta_fields: metaFields,
        });
      }

      return request('GET', url).then(resp => resp.fields);
    }
  }

  return new IndexPatternsApiClient();
}
