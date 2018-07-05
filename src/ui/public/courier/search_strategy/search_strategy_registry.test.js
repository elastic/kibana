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
  assignSearchRequestsToSearchStrategies,
  addSearchStrategy,
} from './search_strategy_registry';

describe('SearchStrategyRegistry', () => {
  describe('assignSearchRequestsToSearchStrategies', () => {
    test('associates search requests with valid search strategies', () => {
      const searchStrategyA = {
        id: 'a',
        isValidForSearchRequest: searchRequest => {
          return searchRequest.type === 'a';
        },
      };

      addSearchStrategy(searchStrategyA);

      const searchStrategyB = {
        id: 'b',
        isValidForSearchRequest: searchRequest => {
          return searchRequest.type === 'b';
        },
      };

      addSearchStrategy(searchStrategyB);

      const searchRequests = [{
        id: 0,
        type: 'b',
      }, {
        id: 1,
        type: 'a',
      }, {
        id: 2,
        type: 'a',
      }, {
        id: 3,
        type: 'b',
      }];

      const searchStrategiesWithSearchRequests = assignSearchRequestsToSearchStrategies(searchRequests);

      expect(searchStrategiesWithSearchRequests).toEqual([{
        searchStrategy: searchStrategyB,
        searchRequests: [{
          id: 0,
          type: 'b',
        }, {
          id: 3,
          type: 'b',
        }],
      }, {
        searchStrategy: searchStrategyA,
        searchRequests: [{
          id: 1,
          type: 'a',
        }, {
          id: 2,
          type: 'a',
        }],
      }]);
    });
  });
});
