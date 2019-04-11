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
 * @param requestsFetchParams {Array.<Object>}
 * @param options
 */
export function serializeFetchParams(requestsFetchParams, options) {
  const { sessionId, esShardTimeout, setRequestPreference, customRequestPreference } = options;
  const requests = requestsFetchParams.map(fetchParams => {
    const body = {
      ...fetchParams.body || {},
    };
    if (esShardTimeout > 0) {
      body.timeout = `${esShardTimeout}ms`;
    }

    const header = {
      index: fetchParams.index.toIndex(),
      type: fetchParams.type,
      search_type: fetchParams.search_type,
      ignore_unavailable: true,
    };
    if (setRequestPreference === 'sessionId') {
      header.preference = sessionId;
    } else if (setRequestPreference === 'custom') {
      header.preference = customRequestPreference;
    }

    return `${JSON.stringify(header)}\n${JSON.stringify(body)}`;
  });
  return requests.join('\n') + '\n';
}

