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

import type { MockedKeys } from '@kbn/utility-types/jest';
import type { ExecutionContext } from 'src/plugins/expressions/public';
import type { IndexPatternsContract } from '../../../common/index_patterns/index_patterns';
import type {
  ISearchStartSearchSource,
  KibanaContext,
  EsaggsStartDependencies,
  EsaggsExpressionFunctionDefinition,
} from '../../../common/search';
import type { AggsStart } from '../aggs/types';
import { getFunctionDefinition } from './esaggs';

jest.mock('../../../common/search/expressions', () => ({
  getEsaggsMeta: jest.fn().mockReturnValue({ name: 'esaggs' }),
  handleEsaggsRequest: jest.fn().mockResolvedValue({}),
}));

import { getEsaggsMeta, handleEsaggsRequest } from '../../../common/search/expressions';

describe('esaggs expression function - public', () => {
  let getStartDependencies: () => Promise<MockedKeys<EsaggsStartDependencies>>;
  let startDependencies: MockedKeys<EsaggsStartDependencies>;
  let mockHandlers: MockedKeys<ExecutionContext>;
  let definition: () => EsaggsExpressionFunctionDefinition;
  const args = {
    index: {
      type: 'index_pattern' as 'index_pattern',
      value: { title: 'logstash-*' },
    },
    aggs: [
      {
        type: 'agg_type' as 'agg_type',
        value: { type: 'count' },
      },
      {
        type: 'agg_type' as 'agg_type',
        value: { type: 'avg', params: { field: 'bytes' } },
      },
    ],
    metricsAtAllLevels: true,
    partialRows: false,
    timeFields: ['@timestamp', 'utc_time'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandlers = {
      abortSignal: (jest.fn() as unknown) as jest.Mocked<AbortSignal>,
      getSearchContext: jest.fn(),
      getSearchSessionId: jest.fn().mockReturnValue('abc123'),
      inspectorAdapters: jest.fn(),
      variables: {},
      types: {},
    };
    startDependencies = {
      addFilters: jest.fn(),
      aggs: ({
        createAggConfigs: jest.fn().mockReturnValue({ foo: 'bar' }),
      } as unknown) as jest.Mocked<AggsStart>,
      deserializeFieldFormat: jest.fn().mockImplementation((f: any) => f),
      indexPatterns: ({
        create: jest.fn().mockResolvedValue({}),
      } as unknown) as jest.Mocked<IndexPatternsContract>,
      searchSource: ({} as unknown) as jest.Mocked<ISearchStartSearchSource>,
    };
    getStartDependencies = jest.fn().mockResolvedValue(startDependencies);
    definition = getFunctionDefinition({ getStartDependencies });
  });

  test('calls indexPatterns.create with the values provided by the subexpression arg', async () => {
    await definition().fn(null, args, mockHandlers);

    expect(startDependencies.indexPatterns.create).toHaveBeenCalledWith(args.index.value, true);
  });

  test('calls aggs.createAggConfigs with the values provided by the subexpression arg', async () => {
    await definition().fn(null, args, mockHandlers);

    expect(startDependencies.aggs.createAggConfigs).toHaveBeenCalledWith(
      {},
      args.aggs.map((agg) => agg.value)
    );
  });

  test('calls getEsaggsMeta to retrieve meta', () => {
    const result = definition();

    expect(getEsaggsMeta).toHaveBeenCalledTimes(1);
    expect(result.name).toBe('esaggs');
  });

  test('calls handleEsaggsRequest with all of the right dependencies', async () => {
    await definition().fn(null, args, mockHandlers);

    expect(handleEsaggsRequest).toHaveBeenCalledWith(null, args, {
      abortSignal: mockHandlers.abortSignal,
      addFilters: startDependencies.addFilters,
      aggs: { foo: 'bar' },
      deserializeFieldFormat: startDependencies.deserializeFieldFormat,
      filters: undefined,
      indexPattern: {},
      inspectorAdapters: mockHandlers.inspectorAdapters,
      metricsAtAllLevels: args.metricsAtAllLevels,
      partialRows: args.partialRows,
      query: undefined,
      searchSessionId: 'abc123',
      searchSourceService: startDependencies.searchSource,
      timeFields: args.timeFields,
      timeRange: undefined,
    });
  });

  test('passes input to handleEsaggsRequest if it is available', async () => {
    const input = {
      type: 'kibana_context' as 'kibana_context',
      filters: [{ $state: {}, meta: {}, query: {} }],
      query: {
        query: 'hiya',
        language: 'painless',
      },
      timeRange: { from: 'a', to: 'b' },
    } as KibanaContext;

    await definition().fn(input, args, mockHandlers);

    expect(handleEsaggsRequest).toHaveBeenCalledWith(
      input,
      args,
      expect.objectContaining({
        filters: input.filters,
        query: input.query,
        timeRange: input.timeRange,
      })
    );
  });
});
