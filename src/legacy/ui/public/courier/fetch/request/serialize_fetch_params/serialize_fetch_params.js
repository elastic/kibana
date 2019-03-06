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

import _ from 'lodash';

function emptySearch() {
  return {
    query: {
      bool: {
        must_not: [
          { match_all: {} }
        ]
      }
    }
  };
}

/**
 *
 * @param requestsFetchParams {Array.<Object>}
 * @param Promise
 * @param timeFilter - Only needed for time based interval indexes, which support has been removed from in 6.0. Come
 * 7.0 we can completely rip this code out and break them completely. See
 *   https://github.com/elastic/kibana/issues/12242 and
 *   https://github.com/elastic/kibana/pull/12158 for more background
 * @param kbnIndex
 * @param sessionId
 * @return {Promise.<string>}
 */
export function serializeFetchParams(
  requestsFetchParams,
  Promise,
  timeFilter,
  kbnIndex,
  sessionId,
  config,
  esShardTimeout) {
  const indexToListMapping = {};
  const timeBounds = timeFilter.getActiveBounds();
  const promises = requestsFetchParams.map(function (fetchParams) {
    return Promise.resolve(fetchParams.index)
      .then(function (indexList) {
        if (!_.isFunction(_.get(indexList, 'toIndexList'))) {
          return indexList;
        }

        if (!indexToListMapping[indexList.id]) {
          indexToListMapping[indexList.id] = timeBounds
            ? indexList.toIndexList(timeBounds.min, timeBounds.max)
            : indexList.toIndexList();
        }
        return indexToListMapping[indexList.id].then(indexList => {
          // Make sure the index list in the cache can't be subsequently updated.
          return _.clone(indexList);
        });
      })
      .then(function (indexList) {
        let body = {
          ...fetchParams.body || {},
        };
        if (esShardTimeout > 0) {
          body.timeout = `${esShardTimeout}ms`;
        }
        let index = [];
        // If we've reached this point and there are no indexes in the
        // index list at all, it means that we shouldn't expect any indexes
        // to contain the documents we're looking for, so we instead
        // perform a request for an index pattern that we know will always
        // return an empty result (ie. -*). If instead we had gone ahead
        // with an msearch without any index patterns, elasticsearch would
        // handle that request by querying *all* indexes, which is the
        // opposite of what we want in this case.
        if (Array.isArray(indexList) && indexList.length === 0) {
          index.push(kbnIndex);
          body = emptySearch();
        } else {
          index = indexList;
        }

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

