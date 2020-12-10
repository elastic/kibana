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
import type { Filter } from '../../../es_query';
import type { IndexPattern } from '../../../index_patterns';
import type { IAggConfig, IAggConfigs } from '../../aggs';
import type { ISearchSource } from '../../search_source';
import { searchSourceCommonMock } from '../../search_source/mocks';

import { handleRequest, RequestHandlerParams } from './request_handler';

jest.mock('../../tabify', () => ({
  tabifyAggResponse: jest.fn(),
}));

import { tabifyAggResponse } from '../../tabify';

describe('esaggs expression function - public', () => {
  let mockParams: MockedKeys<RequestHandlerParams>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {
      abortSignal: (jest.fn() as unknown) as jest.Mocked<AbortSignal>,
      addFilters: jest.fn(),
      aggs: ({
        aggs: [{ type: { name: 'terms', postFlightRequest: jest.fn().mockResolvedValue({}) } }],
        setTimeRange: jest.fn(),
        toDsl: jest.fn().mockReturnValue({ aggs: {} }),
        onSearchRequestStart: jest.fn(),
      } as unknown) as jest.Mocked<IAggConfigs>,
      deserializeFieldFormat: jest.fn(),
      filters: undefined,
      indexPattern: ({ id: 'logstash-*' } as unknown) as jest.Mocked<IndexPattern>,
      inspectorAdapters: {},
      metricsAtAllLevels: false,
      partialRows: false,
      query: undefined,
      searchSessionId: 'abc123',
      searchSourceService: searchSourceCommonMock,
      timeFields: ['@timestamp', 'utc_time'],
      timeRange: undefined,
    };
  });

  test('should create a new search source instance', async () => {
    await handleRequest(mockParams);
    expect(mockParams.searchSourceService.create).toHaveBeenCalledTimes(1);
  });

  describe('sets the expected fields on search source', () => {
    let searchSource: MockedKeys<ISearchSource>;

    beforeEach(async () => {
      await handleRequest(mockParams);
      searchSource = await mockParams.searchSourceService.create();
    });

    test('setField(index)', () => {
      expect(searchSource.setField).toHaveBeenCalledTimes(5);
      expect((searchSource.setField as jest.Mock).mock.calls[0]).toEqual([
        'index',
        mockParams.indexPattern,
      ]);
    });

    test('setField(size)', () => {
      expect(searchSource.setField).toHaveBeenCalledTimes(5);
      expect((searchSource.setField as jest.Mock).mock.calls[1]).toEqual(['size', 0]);
    });

    test('setField(aggs)', async () => {
      expect(searchSource.setField).toHaveBeenCalledTimes(5);
      expect(typeof (searchSource.setField as jest.Mock).mock.calls[2][1]).toBe('function');
      expect((searchSource.setField as jest.Mock).mock.calls[2][1]()).toEqual(
        mockParams.aggs.toDsl()
      );
      expect(mockParams.aggs.toDsl).toHaveBeenCalledWith(mockParams.metricsAtAllLevels);

      // make sure param is passed through
      jest.clearAllMocks();
      await handleRequest({
        ...mockParams,
        metricsAtAllLevels: true,
      });
      searchSource = await mockParams.searchSourceService.create();
      (searchSource.setField as jest.Mock).mock.calls[2][1]();
      expect(mockParams.aggs.toDsl).toHaveBeenCalledWith(true);
    });

    test('setField(filter)', async () => {
      expect(searchSource.setField).toHaveBeenCalledTimes(5);
      expect((searchSource.setField as jest.Mock).mock.calls[3]).toEqual([
        'filter',
        mockParams.filters,
      ]);

      // make sure param is passed through
      jest.clearAllMocks();
      const mockFilters = [{ meta: {} }] as Filter[];
      await handleRequest({
        ...mockParams,
        filters: mockFilters,
      });
      searchSource = await mockParams.searchSourceService.create();
      expect((searchSource.setField as jest.Mock).mock.calls[3]).toEqual(['filter', mockFilters]);
    });

    test('setField(query)', async () => {
      expect(searchSource.setField).toHaveBeenCalledTimes(5);
      expect((searchSource.setField as jest.Mock).mock.calls[4]).toEqual([
        'query',
        mockParams.query,
      ]);

      // make sure param is passed through
      jest.clearAllMocks();
      const mockQuery = { query: 'foo', language: 'bar' };
      await handleRequest({
        ...mockParams,
        query: mockQuery,
      });
      searchSource = await mockParams.searchSourceService.create();
      expect((searchSource.setField as jest.Mock).mock.calls[4]).toEqual(['query', mockQuery]);
    });
  });

  test('calls searchSource.fetch', async () => {
    await handleRequest(mockParams);
    const searchSource = await mockParams.searchSourceService.create();
    expect(searchSource.fetch).toHaveBeenCalledWith({
      abortSignal: mockParams.abortSignal,
      sessionId: mockParams.searchSessionId,
    });
  });

  test('calls agg.postFlightRequest if it exiests', async () => {
    await handleRequest(mockParams);
    expect(mockParams.aggs.aggs[0].type.postFlightRequest).toHaveBeenCalledTimes(1);

    // ensure it works if the function doesn't exist
    jest.clearAllMocks();
    mockParams.aggs.aggs[0] = ({ type: { name: 'count' } } as unknown) as IAggConfig;
    expect(async () => await handleRequest(mockParams)).not.toThrowError();
  });

  test('tabifies response data', async () => {
    await handleRequest(mockParams);
    expect(tabifyAggResponse).toHaveBeenCalledWith(
      mockParams.aggs,
      {},
      {
        metricsAtAllLevels: mockParams.metricsAtAllLevels,
        partialRows: mockParams.partialRows,
        timeRange: mockParams.timeRange,
      }
    );
  });

  test('calculates timerange bounds for tabify', async () => {
    await handleRequest({
      ...mockParams,
      timeRange: { from: '2020-12-01', to: '2020-12-31' },
    });
    expect((tabifyAggResponse as jest.Mock).mock.calls[0][2].timeRange).toMatchInlineSnapshot(`
      Object {
        "from": "2020-12-01T05:00:00.000Z",
        "timeFields": Array [
          "@timestamp",
          "utc_time",
        ],
        "to": "2020-12-31T05:00:00.000Z",
      }
    `);
  });
});
