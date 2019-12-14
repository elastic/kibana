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

import { noOpSearchStrategy } from './no_op_search_strategy';

describe('SearchStrategyRegistry', () => {
  describe('assignSearchRequestsToSearchStrategies', () => {
    test('associates search requests with valid search strategies', () => {
      const searchStrategyA = {
        id: 'a',
        isViable: indexPattern => {
          return indexPattern === 'a';
        },
      };

      addSearchStrategy(searchStrategyA);

      const searchStrategyB = {
        id: 'b',
        isViable: indexPattern => {
          return indexPattern === 'b';
        },
      };

      addSearchStrategy(searchStrategyB);

      const searchRequest0 = {
        id: 0,
        source: { getField: () => 'b', getPreferredSearchStrategyId: () => {} },
      };

      const searchRequest1 = {
        id: 1,
        source: { getField: () => 'a', getPreferredSearchStrategyId: () => {} },
      };

      const searchRequest2 = {
        id: 2,
        source: { getField: () => 'a', getPreferredSearchStrategyId: () => {} },
      };

      const searchRequest3 = {
        id: 3,
        source: { getField: () => 'b', getPreferredSearchStrategyId: () => {} },
      };

      const searchRequests = [searchRequest0, searchRequest1, searchRequest2, searchRequest3];
      const searchStrategiesWithSearchRequests = assignSearchRequestsToSearchStrategies(
        searchRequests
      );

      expect(searchStrategiesWithSearchRequests).toEqual([
        {
          searchStrategy: searchStrategyB,
          searchRequests: [searchRequest0, searchRequest3],
        },
        {
          searchStrategy: searchStrategyA,
          searchRequests: [searchRequest1, searchRequest2],
        },
      ]);
    });

    test(`associates search requests with noOpSearchStrategy when a viable one can't be found`, () => {
      const searchRequest0 = {
        id: 0,
        source: { getField: () => {}, getPreferredSearchStrategyId: () => {} },
      };

      const searchRequests = [searchRequest0];
      const searchStrategiesWithSearchRequests = assignSearchRequestsToSearchStrategies(
        searchRequests
      );

      expect(searchStrategiesWithSearchRequests).toEqual([
        {
          searchStrategy: noOpSearchStrategy,
          searchRequests: [searchRequest0],
        },
      ]);
    });
  });
});
