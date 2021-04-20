/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import type { Filter } from '../../../es_query';
import type { IndexPattern } from '../../../index_patterns';
import type { IAggConfigs } from '../../aggs';
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
      aggs: ({
        aggs: [{ type: { name: 'terms', postFlightRequest: jest.fn().mockResolvedValue({}) } }],
        setTimeRange: jest.fn(),
        toDsl: jest.fn().mockReturnValue({ aggs: {} }),
        onSearchRequestStart: jest.fn(),
        setTimeFields: jest.fn(),
      } as unknown) as jest.Mocked<IAggConfigs>,
      filters: undefined,
      indexPattern: ({ id: 'logstash-*' } as unknown) as jest.Mocked<IndexPattern>,
      inspectorAdapters: {},
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
      expect((searchSource.setField as jest.Mock).mock.calls[2][1]).toEqual(mockParams.aggs);
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

    expect(searchSource.fetch$).toHaveBeenCalledWith({
      abortSignal: mockParams.abortSignal,
      sessionId: mockParams.searchSessionId,
      inspector: {
        title: 'Data',
        description: 'This request queries Elasticsearch to fetch the data for the visualization.',
        adapter: undefined,
      },
    });
  });

  test('tabifies response data', async () => {
    await handleRequest(mockParams);
    expect(tabifyAggResponse).toHaveBeenCalledWith(
      mockParams.aggs,
      {},
      {
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
