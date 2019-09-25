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

import { noOpSearchStrategy } from './no_op_search_strategy';
import {
  searchStrategies,
  addSearchStrategy,
  getSearchStrategyByViability,
  getSearchStrategyById,
  getSearchStrategyForSearchRequest,
  hasSearchStategyForIndexPattern
} from './search_strategy_registry';

const mockSearchStrategies = [{
  id: 0,
  isViable: index => index === 0
}, {
  id: 1,
  isViable: index => index === 1
}];

describe('Search strategy registry', () => {
  beforeEach(() => {
    searchStrategies.length = 0;
  });

  describe('addSearchStrategy', () => {
    it('adds a search strategy', () => {
      addSearchStrategy(mockSearchStrategies[0]);
      expect(searchStrategies.length).toBe(1);
    });

    it('does not add a search strategy if it is already included', () => {
      addSearchStrategy(mockSearchStrategies[0]);
      addSearchStrategy(mockSearchStrategies[0]);
      expect(searchStrategies.length).toBe(1);
    });
  });

  describe('getSearchStrategyByViability', () => {
    beforeEach(() => {
      mockSearchStrategies.forEach(addSearchStrategy);
    });

    it('returns the viable strategy', () => {
      expect(getSearchStrategyByViability(0)).toBe(mockSearchStrategies[0]);
      expect(getSearchStrategyByViability(1)).toBe(mockSearchStrategies[1]);
    });

    it('returns undefined if there is no viable strategy', () => {
      expect(getSearchStrategyByViability(-1)).toBe(undefined);
    });
  });

  describe('getSearchStrategyById', () => {
    beforeEach(() => {
      mockSearchStrategies.forEach(addSearchStrategy);
    });

    it('returns the strategy by ID', () => {
      expect(getSearchStrategyById(0)).toBe(mockSearchStrategies[0]);
      expect(getSearchStrategyById(1)).toBe(mockSearchStrategies[1]);
    });

    it('returns undefined if there is no strategy with that ID', () => {
      expect(getSearchStrategyById(-1)).toBe(undefined);
    });
  });

  describe('getSearchStrategyForSearchRequest', () => {
    beforeEach(() => {
      mockSearchStrategies.forEach(addSearchStrategy);
    });

    it('returns the strategy by ID if provided', () => {
      expect(getSearchStrategyForSearchRequest({}, { searchStrategyId: 1 })).toBe(mockSearchStrategies[1]);
    });

    it('returns the strategy by viability if there is one', () => {
      expect(getSearchStrategyForSearchRequest({ index: 1 })).toBe(mockSearchStrategies[1]);
    });

    it('returns the no op strategy if there is no viable strategy', () => {
      expect(getSearchStrategyForSearchRequest({ index: 3 })).toBe(noOpSearchStrategy);
    });
  });

  describe('hasSearchStategyForIndexPattern', () => {
    beforeEach(() => {
      mockSearchStrategies.forEach(addSearchStrategy);
    });

    it('returns whether there is a search strategy for this index pattern', () => {
      expect(hasSearchStategyForIndexPattern(0)).toBe(true);
      expect(hasSearchStategyForIndexPattern(-1)).toBe(false);
    });
  });
});
