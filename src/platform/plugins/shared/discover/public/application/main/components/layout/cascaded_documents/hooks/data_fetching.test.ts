/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import { dataViewWithTimefieldMock } from '../../../../../../__mocks__/data_view_with_timefield';
import { discoverServiceMock } from '../../../../../../__mocks__/services';
import {
  useGroupedCascadeData,
  useScopedESQLQueryFetchClient,
  useDataCascadeRowExpansionHandlers,
} from './data_fetching';
import { fetchEsql } from '../../../../data_fetching/fetch_esql';
import { constructCascadeQuery } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import { apm } from '@elastic/apm-rum';
import type { ESQLStatsQueryMeta } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import type { ESQLDataGroupNode } from '../blocks';
import type { RecordsFetchResponse } from '../../../../../types';

jest.mock('../../../../data_fetching/fetch_esql', () => ({
  fetchEsql: jest.fn(),
}));

jest.mock('@kbn/esql-utils/src/utils/cascaded_documents_helpers', () => ({
  ...jest.requireActual('@kbn/esql-utils/src/utils/cascaded_documents_helpers'),
  constructCascadeQuery: jest.fn(),
}));

jest.mock('@elastic/apm-rum', () => ({
  apm: {
    captureError: jest.fn(),
  },
}));

const mockFetchEsql = fetchEsql as jest.MockedFunction<typeof fetchEsql>;
const mockConstructCascadeQuery = constructCascadeQuery as jest.MockedFunction<
  typeof constructCascadeQuery
>;
const mockApmCaptureError = apm.captureError as jest.MockedFunction<typeof apm.captureError>;

describe('data_fetching related hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useGroupedCascadeData', () => {
    const createMockRows = (data: Array<Record<string, unknown>>): DataTableRecord[] =>
      data.map((item, idx) => ({
        id: String(idx),
        raw: item,
        flattened: item,
      }));

    const defaultQueryMeta: ESQLStatsQueryMeta = {
      groupByFields: [{ field: 'category', type: 'column' }],
      appliedFunctions: [{ identifier: 'count', aggregation: 'count' }],
    };

    const defaultSelectedCascadeGroups = ['category'];

    it('should return empty array when rows are undefined', () => {
      const { result } = renderHook(() =>
        useGroupedCascadeData({
          selectedCascadeGroups: defaultSelectedCascadeGroups,
          rows: undefined,
          queryMeta: defaultQueryMeta,
          esqlVariables: undefined,
        })
      );

      expect(result.current).toEqual([]);
    });

    it('should return empty array when rows are empty', () => {
      const { result } = renderHook(() =>
        useGroupedCascadeData({
          selectedCascadeGroups: defaultSelectedCascadeGroups,
          rows: [],
          queryMeta: defaultQueryMeta,
          esqlVariables: undefined,
        })
      );

      expect(result.current).toEqual([]);
    });

    it('should group rows by selected cascade groups', () => {
      const mockRows = createMockRows([
        { category: 'A', count: 10 },
        { category: 'A', count: 5 },
        { category: 'B', count: 20 },
      ]);

      const { result } = renderHook(() =>
        useGroupedCascadeData({
          selectedCascadeGroups: defaultSelectedCascadeGroups,
          rows: mockRows,
          queryMeta: defaultQueryMeta,
          esqlVariables: undefined,
        })
      );

      expect(result.current).toHaveLength(2);
      expect(result.current[0].groupValue).toBe('A');
      expect(result.current[0].aggregatedValues.count).toBe(15); // 10 + 5 aggregated
      expect(result.current[1].groupValue).toBe('B');
      expect(result.current[1].aggregatedValues.count).toBe(20);
    });

    it('should skip undefined and null values in grouping', () => {
      const mockRows = createMockRows([
        { category: 'A', count: 10 },
        { category: undefined, count: 5 },
        { category: null, count: 15 },
        { category: 'B', count: 20 },
      ]);

      const { result } = renderHook(() =>
        useGroupedCascadeData({
          selectedCascadeGroups: defaultSelectedCascadeGroups,
          rows: mockRows,
          queryMeta: defaultQueryMeta,
          esqlVariables: undefined,
        })
      );

      expect(result.current).toHaveLength(2);
      expect(result.current.find((r) => r.groupValue === 'A')).toBeDefined();
      expect(result.current.find((r) => r.groupValue === 'B')).toBeDefined();
    });

    it('should aggregate multiple applied functions', () => {
      const mockRows = createMockRows([
        { category: 'A', count: 10, sum: 100 },
        { category: 'A', count: 5, sum: 50 },
      ]);

      const queryMetaWithMultipleFunctions: ESQLStatsQueryMeta = {
        groupByFields: [{ field: 'category', type: 'column' }],
        appliedFunctions: [
          { identifier: 'count', aggregation: 'count' },
          { identifier: 'sum', aggregation: 'sum' },
        ],
      };

      const { result } = renderHook(() =>
        useGroupedCascadeData({
          selectedCascadeGroups: defaultSelectedCascadeGroups,
          rows: mockRows,
          queryMeta: queryMetaWithMultipleFunctions,
          esqlVariables: undefined,
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].aggregatedValues.count).toBe(15);
      expect(result.current[0].aggregatedValues.sum).toBe(150);
    });

    it('should aggregate multiple applied functions with array values', () => {
      const mockRows = createMockRows([
        { category: 'A', count: 10, ext: ['css', 'js'] },
        { category: 'A', count: 5, ext: ['deb', 'rpm'] },
      ]);

      const queryMetaWithMultipleFunctions: ESQLStatsQueryMeta = {
        groupByFields: [{ field: 'category', type: 'column' }],
        appliedFunctions: [
          { identifier: 'count', aggregation: 'count' },
          { identifier: 'ext', aggregation: 'ext' },
        ],
      };

      const { result } = renderHook(() =>
        useGroupedCascadeData({
          selectedCascadeGroups: defaultSelectedCascadeGroups,
          rows: mockRows,
          queryMeta: queryMetaWithMultipleFunctions,
          esqlVariables: undefined,
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].aggregatedValues.count).toBe(15);
      expect(result.current[0].aggregatedValues.ext).toEqual(['css', 'js', 'deb', 'rpm']);
    });

    it('should resolve esql variable for group key', () => {
      const mockRows = createMockRows([
        { actualField: 'X', count: 10 },
        { actualField: 'X', count: 5 },
        { actualField: 'Y', count: 20 },
      ]);

      const esqlVariables: ESQLControlVariable[] = [
        { key: 'myVar', value: 'actualField', type: ESQLVariableType.FIELDS },
      ];

      const { result } = renderHook(() =>
        useGroupedCascadeData({
          selectedCascadeGroups: ['??myVar'],
          rows: mockRows,
          queryMeta: defaultQueryMeta,
          esqlVariables,
        })
      );

      expect(result.current).toHaveLength(2);
      expect(result.current[0].groupValue).toBe('X');
      expect(result.current[1].groupValue).toBe('Y');
    });
  });

  describe('useScopedESQLQueryFetchClient', () => {
    const scopedProfilesManager = discoverServiceMock.profilesManager.createScopedProfilesManager({
      scopedEbtManager: discoverServiceMock.ebtManager.createScopedEBTManager(),
    });

    const defaultProps = {
      query: { esql: 'FROM logs | STATS count() BY category' },
      dataView: dataViewWithTimefieldMock,
      data: discoverServiceMock.data,
      expressions: discoverServiceMock.expressions,
      esqlVariables: undefined,
      filters: undefined,
      timeRange: undefined,
      scopedProfilesManager,
      inspectorAdapters: { requests: new RequestAdapter() },
    };

    const createMockFetchResponse = (records: DataTableRecord[] = []): RecordsFetchResponse => ({
      records,
      esqlQueryColumns: [],
      esqlHeaderWarning: undefined,
      interceptedWarnings: [],
    });

    beforeEach(() => {
      mockFetchEsql.mockResolvedValue(createMockFetchResponse());
      mockConstructCascadeQuery.mockReturnValue({ esql: 'FROM logs | WHERE category == "A"' });
    });

    it('should return a fetch function with cancel method', () => {
      const { result } = renderHook(() => useScopedESQLQueryFetchClient(defaultProps));

      expect(result.current).toBeInstanceOf(Function);
      expect(result.current.cancel).toBeInstanceOf(Function);
    });

    it('should fetch data by invoking constructCascadeQuery and fetchEsql', async () => {
      const mockRecords: DataTableRecord[] = [{ id: '1', raw: {}, flattened: { category: 'A' } }];
      mockFetchEsql.mockResolvedValue(createMockFetchResponse(mockRecords));

      const { result } = renderHook(() => useScopedESQLQueryFetchClient(defaultProps));

      let records: DataTableRecord[] = [];

      await act(async () => {
        records = await result.current({
          nodeType: 'leaf',
          nodePath: ['category'],
          nodePathMap: { category: 'A' },
        });
      });

      expect(mockConstructCascadeQuery).toHaveBeenCalledWith({
        query: defaultProps.query,
        esqlVariables: undefined,
        dataView: dataViewWithTimefieldMock,
        nodeType: 'leaf',
        nodePath: ['category'],
        nodePathMap: { category: 'A' },
      });
      expect(mockFetchEsql).toHaveBeenCalled();
      expect(records).toEqual(mockRecords);
    });

    it('should return empty array and capture error when constructCascadeQuery returns undefined', async () => {
      mockConstructCascadeQuery.mockReturnValue(undefined);

      const { result } = renderHook(() => useScopedESQLQueryFetchClient(defaultProps));

      let records: DataTableRecord[] = [];
      await act(async () => {
        records = await result.current({
          nodeType: 'leaf',
          nodePath: ['category'],
          nodePathMap: { category: 'A' },
        });
      });

      expect(records).toEqual([]);
      expect(mockApmCaptureError).toHaveBeenCalledWith(
        new Error('Failed to construct cascade query')
      );
      expect(mockFetchEsql).not.toHaveBeenCalled();
    });

    it('should abort previous requests when making a new request', async () => {
      const mockRecords: DataTableRecord[] = [{ id: '1', raw: {}, flattened: { category: 'A' } }];

      let resolveFirst: (value: RecordsFetchResponse) => void;
      const firstPromise = new Promise<RecordsFetchResponse>((resolve) => {
        resolveFirst = resolve;
      });

      mockFetchEsql
        .mockImplementationOnce(() => firstPromise)
        .mockResolvedValueOnce(createMockFetchResponse(mockRecords));

      const { result } = renderHook(() => useScopedESQLQueryFetchClient(defaultProps));

      // Start first request (don't await)
      result.current({
        nodeType: 'leaf',
        nodePath: ['category'],
        nodePathMap: { category: 'A' },
      });

      // Start second request immediately (should abort first)
      const secondRequest = result.current({
        nodeType: 'leaf',
        nodePath: ['category'],
        nodePathMap: { category: 'B' },
      });

      // Resolve first request after abort
      resolveFirst!(createMockFetchResponse());

      const secondRecords = await secondRequest;
      expect(secondRecords).toEqual(mockRecords);
    });

    it('should handle abort errors gracefully', async () => {
      const { result } = renderHook(() => useScopedESQLQueryFetchClient(defaultProps));

      let records: DataTableRecord[] = [];

      const pendingRequest = result.current({
        nodeType: 'leaf',
        nodePath: ['category'],
        nodePathMap: { category: 'A' },
      });

      act(() => {
        result.current.cancel();
      });

      await act(async () => {
        records = await pendingRequest;
      });

      expect(records).toEqual([]);
    });

    it('should rethrow non-abort errors', async () => {
      const networkError = new Error('Network failure');
      mockFetchEsql.mockRejectedValue(networkError);

      const { result } = renderHook(() => useScopedESQLQueryFetchClient(defaultProps));

      await expect(
        result.current({
          nodeType: 'leaf',
          nodePath: ['category'],
          nodePathMap: { category: 'A' },
        })
      ).rejects.toThrow('Network failure');
    });

    it('should cancel pending requests on unmount', async () => {
      const { result, unmount } = renderHook(() => useScopedESQLQueryFetchClient(defaultProps));

      // Start a request
      const pendingRequestPromise = result.current({
        nodeType: 'leaf',
        nodePath: ['category'],
        nodePathMap: { category: 'A' },
      });

      // Unmount the hook
      unmount();

      // The abort controller should have been called
      // Request should complete gracefully
      await expect(pendingRequestPromise).resolves.toBeDefined();
    });
  });

  describe('useDataCascadeRowExpansionHandlers', () => {
    const createMockCascadeFetchClient = () => {
      const mockFetch = jest.fn().mockResolvedValue([]) as jest.Mock & { cancel: jest.Mock };
      mockFetch.cancel = jest.fn();
      return mockFetch as unknown as ReturnType<typeof useScopedESQLQueryFetchClient>;
    };

    const createMockRowData = (): ESQLDataGroupNode => ({
      id: '1',
      groupColumn: 'category',
      groupValue: 'A',
      aggregatedValues: {},
    });

    it('should return all four expansion handlers', () => {
      const mockCascadeFetchClient = createMockCascadeFetchClient();

      const { result } = renderHook(() =>
        useDataCascadeRowExpansionHandlers({
          cascadeFetchClient: mockCascadeFetchClient,
        })
      );

      expect(result.current.onCascadeGroupNodeExpanded).toBeInstanceOf(Function);
      expect(result.current.onCascadeGroupNodeCollapsed).toBeInstanceOf(Function);
      expect(result.current.onCascadeLeafNodeExpanded).toBeInstanceOf(Function);
      expect(result.current.onCascadeLeafNodeCollapsed).toBeInstanceOf(Function);
    });

    describe('onCascadeGroupNodeExpanded', () => {
      it('should call cascadeFetchClient with nodeType "group"', async () => {
        const mockCascadeFetchClient = createMockCascadeFetchClient();
        const mockRow = createMockRowData();

        const { result } = renderHook(() =>
          useDataCascadeRowExpansionHandlers({
            cascadeFetchClient: mockCascadeFetchClient,
          })
        );

        await act(async () => {
          await result.current.onCascadeGroupNodeExpanded({
            row: mockRow,
            nodePath: ['category', 'subcategory'],
            nodePathMap: { category: 'A', subcategory: 'X' },
          });
        });

        expect(mockCascadeFetchClient).toHaveBeenCalledWith({
          nodePath: ['category', 'subcategory'],
          nodePathMap: { category: 'A', subcategory: 'X' },
          nodeType: 'group',
        });
      });
    });

    describe('onCascadeGroupNodeCollapsed', () => {
      it('should call cascadeFetchClient.cancel', () => {
        const mockCascadeFetchClient = createMockCascadeFetchClient();
        const mockRow = createMockRowData();

        const { result } = renderHook(() =>
          useDataCascadeRowExpansionHandlers({
            cascadeFetchClient: mockCascadeFetchClient,
          })
        );

        result.current.onCascadeGroupNodeCollapsed!({
          row: mockRow,
          nodePath: ['category'],
          nodePathMap: { category: 'A' },
        });

        expect(mockCascadeFetchClient.cancel).toHaveBeenCalled();
      });
    });

    describe('onCascadeLeafNodeExpanded', () => {
      it('should call cascadeFetchClient with nodeType "leaf"', async () => {
        const mockCascadeFetchClient = createMockCascadeFetchClient();
        const mockRow = createMockRowData();

        const { result } = renderHook(() =>
          useDataCascadeRowExpansionHandlers({
            cascadeFetchClient: mockCascadeFetchClient,
          })
        );

        await act(async () => {
          await result.current.onCascadeLeafNodeExpanded({
            row: mockRow,
            nodePath: ['category'],
            nodePathMap: { category: 'A' },
          });
        });

        expect(mockCascadeFetchClient).toHaveBeenCalledWith({
          nodePath: ['category'],
          nodePathMap: { category: 'A' },
          nodeType: 'leaf',
        });
      });
    });

    describe('onCascadeLeafNodeCollapsed', () => {
      it('should call cascadeFetchClient.cancel', () => {
        const mockCascadeFetchClient = createMockCascadeFetchClient();
        const mockRow = createMockRowData();

        const { result } = renderHook(() =>
          useDataCascadeRowExpansionHandlers({
            cascadeFetchClient: mockCascadeFetchClient,
          })
        );

        result.current.onCascadeLeafNodeCollapsed!({
          row: mockRow,
          nodePath: ['category'],
          nodePathMap: { category: 'A' },
        });

        expect(mockCascadeFetchClient.cancel).toHaveBeenCalled();
      });
    });

    it('should memoize handlers and return same references on rerender', () => {
      const mockCascadeFetchClient = createMockCascadeFetchClient();

      const { result, rerender } = renderHook(() =>
        useDataCascadeRowExpansionHandlers({
          cascadeFetchClient: mockCascadeFetchClient,
        })
      );

      const firstResult = result.current;

      rerender();

      expect(result.current.onCascadeGroupNodeExpanded).toBe(
        firstResult.onCascadeGroupNodeExpanded
      );
      expect(result.current.onCascadeGroupNodeCollapsed).toBe(
        firstResult.onCascadeGroupNodeCollapsed
      );
      expect(result.current.onCascadeLeafNodeExpanded).toBe(firstResult.onCascadeLeafNodeExpanded);
      expect(result.current.onCascadeLeafNodeCollapsed).toBe(
        firstResult.onCascadeLeafNodeCollapsed
      );
    });

    it('should update handlers when cascadeFetchClient changes', () => {
      const mockCascadeFetchClient1 = createMockCascadeFetchClient();
      const mockCascadeFetchClient2 = createMockCascadeFetchClient();

      const { result, rerender } = renderHook(
        ({ cascadeFetchClient }) =>
          useDataCascadeRowExpansionHandlers({
            cascadeFetchClient,
          }),
        {
          initialProps: { cascadeFetchClient: mockCascadeFetchClient1 },
        }
      );

      const firstResult = result.current;

      rerender({ cascadeFetchClient: mockCascadeFetchClient2 });

      // Handlers should be new references after dependency change
      expect(result.current.onCascadeGroupNodeExpanded).not.toBe(
        firstResult.onCascadeGroupNodeExpanded
      );
    });
  });
});
