/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import type { AggregateQuery } from '@kbn/es-query';
import { dataViewWithTimefieldMock } from '../../../../../../__mocks__/data_view_with_timefield';
import { useGroupedCascadeData, useDataCascadeRowExpansionHandlers } from './data_fetching';
import type { ESQLStatsQueryMeta } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import type { ESQLDataGroupNode } from '../blocks';
import { CascadedDocumentsProvider } from '../cascaded_documents_provider';
import type { CascadedDocumentsContext } from '../cascaded_documents_provider';
import { createElement, type ReactNode } from 'react';
import type { CascadedDocumentsFetcher } from '../../../../data_fetching/cascaded_documents_fetcher';

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

  describe('useDataCascadeRowExpansionHandlers', () => {
    const createMockFetcher = () =>
      ({
        fetchCascadedDocuments: jest.fn().mockResolvedValue([]),
        cancelFetch: jest.fn(),
      } as unknown as CascadedDocumentsFetcher);

    const createWrapper = (overrides?: Partial<CascadedDocumentsContext>) => {
      const esqlQuery: AggregateQuery = { esql: 'FROM logs | STATS count() BY category' };

      const contextValue: CascadedDocumentsContext = {
        availableCascadeGroups: ['category'],
        selectedCascadeGroups: ['category'],
        cascadedDocumentsFetcher: createMockFetcher(),
        esqlQuery,
        esqlVariables: undefined,
        timeRange: undefined,
        viewModeToggle: undefined,
        cascadeGroupingChangeHandler: jest.fn(),
        onUpdateESQLQuery: jest.fn(),
        openInNewTab: jest.fn(),
        ...overrides,
      };

      const Wrapper = ({ children }: { children: ReactNode }) =>
        createElement(CascadedDocumentsProvider, { value: contextValue }, children);

      return { Wrapper, contextValue };
    };

    const createMockRowData = (): ESQLDataGroupNode => ({
      id: '1',
      groupColumn: 'category',
      groupValue: 'A',
      aggregatedValues: {},
    });

    it('should return all four expansion handlers', () => {
      const { Wrapper } = createWrapper();
      const dataView = dataViewWithTimefieldMock;

      const { result } = renderHook(() => useDataCascadeRowExpansionHandlers({ dataView }), {
        wrapper: Wrapper,
      });

      expect(result.current.onCascadeGroupNodeExpanded).toBeInstanceOf(Function);
      expect(result.current.onCascadeGroupNodeCollapsed).toBeInstanceOf(Function);
      expect(result.current.onCascadeLeafNodeExpanded).toBeInstanceOf(Function);
      expect(result.current.onCascadeLeafNodeCollapsed).toBeInstanceOf(Function);
    });

    describe('onCascadeGroupNodeExpanded', () => {
      it('should return an empty array and not fetch', async () => {
        const mockRow = createMockRowData();
        const { Wrapper, contextValue } = createWrapper();
        const dataView = dataViewWithTimefieldMock;

        const { result } = renderHook(() => useDataCascadeRowExpansionHandlers({ dataView }), {
          wrapper: Wrapper,
        });

        const response = await result.current.onCascadeGroupNodeExpanded({
          row: mockRow,
          nodePath: ['category', 'subcategory'],
          nodePathMap: { category: 'A', subcategory: 'X' },
        });

        expect(response).toEqual([]);
        expect(contextValue.cascadedDocumentsFetcher.fetchCascadedDocuments).not.toHaveBeenCalled();
      });
    });

    describe('onCascadeGroupNodeCollapsed', () => {
      it('should not cancel any fetches', () => {
        const mockRow = createMockRowData();
        const { Wrapper, contextValue } = createWrapper();
        const dataView = dataViewWithTimefieldMock;

        const { result } = renderHook(() => useDataCascadeRowExpansionHandlers({ dataView }), {
          wrapper: Wrapper,
        });

        result.current.onCascadeGroupNodeCollapsed!({
          row: mockRow,
          nodePath: ['category'],
          nodePathMap: { category: 'A' },
        });

        expect(contextValue.cascadedDocumentsFetcher.cancelFetch).not.toHaveBeenCalled();
      });
    });

    describe('onCascadeLeafNodeExpanded', () => {
      it('should call cascadedDocumentsFetcher.fetchCascadedDocuments', async () => {
        const mockRow = createMockRowData();
        const { Wrapper, contextValue } = createWrapper();
        const dataView = dataViewWithTimefieldMock;

        const { result } = renderHook(() => useDataCascadeRowExpansionHandlers({ dataView }), {
          wrapper: Wrapper,
        });

        await act(async () => {
          await result.current.onCascadeLeafNodeExpanded({
            row: mockRow,
            nodePath: ['category'],
            nodePathMap: { category: 'A' },
          });
        });

        expect(contextValue.cascadedDocumentsFetcher.fetchCascadedDocuments).toHaveBeenCalledWith({
          nodeId: mockRow.id,
          nodeType: 'leaf',
          nodePath: ['category'],
          nodePathMap: { category: 'A' },
          query: contextValue.esqlQuery,
          esqlVariables: contextValue.esqlVariables,
          timeRange: contextValue.timeRange,
          dataView,
        });
      });
    });

    describe('onCascadeLeafNodeCollapsed', () => {
      it('should call cascadedDocumentsFetcher.cancelFetch', () => {
        const mockRow = createMockRowData();
        const { Wrapper, contextValue } = createWrapper();
        const dataView = dataViewWithTimefieldMock;

        const { result } = renderHook(() => useDataCascadeRowExpansionHandlers({ dataView }), {
          wrapper: Wrapper,
        });

        result.current.onCascadeLeafNodeCollapsed!({
          row: mockRow,
          nodePath: ['category'],
          nodePathMap: { category: 'A' },
        });

        expect(contextValue.cascadedDocumentsFetcher.cancelFetch).toHaveBeenCalledWith(mockRow.id);
      });
    });

    it('should memoize handlers and return same references on rerender', () => {
      const { Wrapper } = createWrapper();
      const dataView = dataViewWithTimefieldMock;

      const { result, rerender } = renderHook(
        () => useDataCascadeRowExpansionHandlers({ dataView }),
        { wrapper: Wrapper }
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
  });
});
