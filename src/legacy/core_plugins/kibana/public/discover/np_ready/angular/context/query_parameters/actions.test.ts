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

// @ts-ignore
import { getQueryParameterActions } from './actions';
import {
  FilterManager,
  IndexPatternsContract,
} from '../../../../../../../../../plugins/data/public';
let state: {
  queryParameters: {
    defaultStepSize: number;
    indexPatternId: string;
    predecessorCount: number;
    successorCount: number;
  };
};
let filterManager: FilterManager;
let indexPatterns: IndexPatternsContract;

beforeEach(() => {
  indexPatterns = {
    get: () => {
      return {
        popularizeField: jest.fn(),
      };
    },
  } as IndexPatternsContract;

  filterManager = {
    filters: [],
    addFilters: jest.fn(),
    setFilters: jest.fn(),
    getAppFilters: () => [],
  } as FilterManager;

  state = {
    queryParameters: {
      defaultStepSize: 3,
      indexPatternId: 'INDEX_PATTERN_ID',
      predecessorCount: 10,
      successorCount: 10,
    },
  };
});

describe('context query_parameter actions', function() {
  describe('action addFilter', () => {
    it('should pass the given arguments to the filterManager', () => {
      const { addFilter } = getQueryParameterActions(filterManager, indexPatterns);

      addFilter(state)('FIELD_NAME', 'FIELD_VALUE', 'FILTER_OPERATION');

      // get the generated filter
      const generatedFilter = filterManager.addFilters.mock.calls[0][0][0];
      const queryKeys = Object.keys(generatedFilter.query.match_phrase);
      expect(filterManager.addFilters.mock.calls.length).toBe(1);
      expect(queryKeys[0]).toBe('FIELD_NAME');
      expect(generatedFilter.query.match_phrase[queryKeys[0]]).toBe('FIELD_VALUE');
    });

    it('should pass the index pattern id to the filterManager', () => {
      const { addFilter } = getQueryParameterActions(filterManager, indexPatterns);
      addFilter(state)('FIELD_NAME', 'FIELD_VALUE', 'FILTER_OPERATION');
      const generatedFilter = filterManager.addFilters.mock.calls[0][0][0];
      expect(generatedFilter.meta.index).toBe('INDEX_PATTERN_ID');
    });
  });
  describe('action setPredecessorCount', () => {
    it('should set the predecessorCount to the given value', () => {
      const { setPredecessorCount } = getQueryParameterActions(indexPatterns, filterManager);
      setPredecessorCount(state)(20);
      expect(state.queryParameters.predecessorCount).toBe(20);
    });

    it('should limit the predecessorCount to 0 as a lower bound', () => {
      const { setPredecessorCount } = getQueryParameterActions(indexPatterns, filterManager);
      setPredecessorCount(state)(-1);
      expect(state.queryParameters.predecessorCount).toBe(0);
    });

    it('should limit the predecessorCount to 10000 as an upper bound', () => {
      const { setPredecessorCount } = getQueryParameterActions(indexPatterns, filterManager);
      setPredecessorCount(state)(20000);
      expect(state.queryParameters.predecessorCount).toBe(10000);
    });
  });
});
