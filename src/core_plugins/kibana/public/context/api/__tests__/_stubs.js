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

import sinon from 'sinon';

export function createCourierStub() {
  return {
    indexPatterns: {
      get: sinon.spy(indexPatternId =>
        Promise.resolve({
          id: indexPatternId,
        })
      ),
    },
  };
}

export function createSearchSourceStubProvider(hits, timeField) {
  const searchSourceStub = {
    _stubHits: hits,
    _stubTimeField: timeField,
    _createStubHit: (timestamp, tiebreaker = 0) => ({
      [searchSourceStub._stubTimeField]: timestamp,
      sort: [timestamp, tiebreaker],
    }),
  };

  searchSourceStub.filter = sinon.stub().returns(searchSourceStub);
  searchSourceStub.inherits = sinon.stub().returns(searchSourceStub);
  searchSourceStub.set = sinon.stub().returns(searchSourceStub);
  searchSourceStub.get = sinon.spy(key => {
    const previousSetCall = searchSourceStub.set.withArgs(key).lastCall;
    return previousSetCall ? previousSetCall.args[1] : null;
  });
  searchSourceStub.fetchAsRejectablePromise = sinon.spy(() => {
    const timeField = searchSourceStub._stubTimeField;
    const lastQuery = searchSourceStub.set.withArgs('query').lastCall.args[1];
    const timeRange = lastQuery.query.constant_score.filter.range[timeField];
    const lastSort = searchSourceStub.set.withArgs('sort').lastCall.args[1];
    const sortDirection = lastSort[0][timeField];
    const sortFunction =
      sortDirection === 'asc'
        ? (first, second) => first[timeField] - second[timeField]
        : (first, second) => second[timeField] - first[timeField];
    const filteredHits = searchSourceStub._stubHits
      .filter(
        hit =>
          hit[timeField] >= timeRange.gte && hit[timeField] <= timeRange.lte
      )
      .sort(sortFunction);
    return Promise.resolve({
      hits: {
        hits: filteredHits,
        total: filteredHits.length,
      },
    });
  });

  return function SearchSourceStubProvider() {
    return searchSourceStub;
  };
}
