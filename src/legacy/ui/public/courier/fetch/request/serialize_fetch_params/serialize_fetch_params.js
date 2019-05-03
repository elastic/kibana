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

/**
 *
 * @param requestsFetchParams {Array.<Object>}
 * @param Promise
 * @param sessionId
 * @return {Promise.<string>}
 */
export function serializeFetchParams(
  requestsFetchParams,
  Promise,
  sessionId,
  config,
  esShardTimeout) {
  const promises = requestsFetchParams.map(function (fetchParams) {
    return Promise.resolve(fetchParams.index)
      .then(function (indexPattern) {
        const body = {
          ...fetchParams.body || {},
        };
        if (esShardTimeout > 0) {
          body.timeout = `${esShardTimeout}ms`;
        }

        const index = (indexPattern && indexPattern.title) ? indexPattern.title : indexPattern;

        const header = {
          index,
          type: fetchParams.type,
          search_type: fetchParams.search_type,
          ignore_unavailable: true,
        };
        if (config.get('courier:setRequestPreference') === 'sessionId') {
          header.preference = sessionId;
        } else if (config.get('courier:setRequestPreference') === 'custom') {
          header.preference = config.get('courier:customRequestPreference');
        }

        return `${JSON.stringify(header)}\n${JSON.stringify(body)}`;
      });
  });

  return Promise.all(promises).then(function (requests) {
    return requests.join('\n') + '\n';
  });
}

