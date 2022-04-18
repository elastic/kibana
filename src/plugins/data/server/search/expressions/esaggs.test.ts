/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import { of as mockOf } from 'rxjs';
import type { MockedKeys } from '@kbn/utility-types/jest';
import { KibanaRequest } from '@kbn/core/server';
import type { ExecutionContext } from '@kbn/expressions-plugin/server';
import type { IndexPatternsContract } from '../../../common';
import type {
  AggsCommonStart,
  ISearchStartSearchSource,
  KibanaContext,
  EsaggsStartDependencies,
  EsaggsExpressionFunctionDefinition,
} from '../../../common/search';
import { getFunctionDefinition } from './esaggs';

jest.mock('../../../common/search/expressions', () => ({
  getEsaggsMeta: jest.fn().mockReturnValue({ name: 'esaggs' }),
  handleEsaggsRequest: jest.fn(() => mockOf({})),
}));

import { getEsaggsMeta, handleEsaggsRequest } from '../../../common/search/expressions';

describe('esaggs expression function - server', () => {
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
      abortSignal: jest.fn() as unknown as jest.Mocked<AbortSignal>,
      getKibanaRequest: jest.fn().mockReturnValue({ id: 'hi' } as KibanaRequest),
      getSearchContext: jest.fn(),
      getSearchSessionId: jest.fn().mockReturnValue('abc123'),
      getExecutionContext: jest.fn(),
      inspectorAdapters: jest.fn(),
      variables: {},
      types: {},
    };
    startDependencies = {
      aggs: {
        createAggConfigs: jest.fn().mockReturnValue({ foo: 'bar' }),
      } as unknown as jest.Mocked<AggsCommonStart>,
      indexPatterns: {
        create: jest.fn().mockResolvedValue({}),
      } as unknown as jest.Mocked<IndexPatternsContract>,
      searchSource: {} as unknown as jest.Mocked<ISearchStartSearchSource>,
    };
    getStartDependencies = jest.fn().mockResolvedValue(startDependencies);
    definition = getFunctionDefinition({ getStartDependencies });
  });

  test('calls getStartDependencies with the KibanaRequest', async () => {
    await definition().fn(null, args, mockHandlers).toPromise();

    expect(getStartDependencies).toHaveBeenCalledWith({ id: 'hi' });
  });

  test('calls indexPatterns.create with the values provided by the subexpression arg', async () => {
    await definition().fn(null, args, mockHandlers).toPromise();

    expect(startDependencies.indexPatterns.create).toHaveBeenCalledWith(args.index.value, true);
  });

  test('calls aggs.createAggConfigs with the values provided by the subexpression arg', async () => {
    await definition().fn(null, args, mockHandlers).toPromise();

    expect(startDependencies.aggs.createAggConfigs).toHaveBeenCalledWith(
      {},
      args.aggs.map((agg) => agg.value)
    );
  });

  test('calls aggs.createAggConfigs with the empty aggs array when not provided', async () => {
    await definition().fn(null, omit(args, 'aggs'), mockHandlers).toPromise();

    expect(startDependencies.aggs.createAggConfigs).toHaveBeenCalledWith({}, []);
  });

  test('calls getEsaggsMeta to retrieve meta', () => {
    const result = definition();

    expect(getEsaggsMeta).toHaveBeenCalledTimes(1);
    expect(result.name).toBe('esaggs');
  });

  test('calls handleEsaggsRequest with all of the right dependencies', async () => {
    await definition().fn(null, args, mockHandlers).toPromise();

    expect(handleEsaggsRequest).toHaveBeenCalledWith({
      abortSignal: mockHandlers.abortSignal,
      aggs: {
        foo: 'bar',
        hierarchical: args.metricsAtAllLevels,
      },
      filters: undefined,
      indexPattern: {},
      inspectorAdapters: mockHandlers.inspectorAdapters,
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

    await definition().fn(input, args, mockHandlers).toPromise();

    expect(handleEsaggsRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: input.filters,
        query: input.query,
        timeRange: input.timeRange,
      })
    );
  });
});
