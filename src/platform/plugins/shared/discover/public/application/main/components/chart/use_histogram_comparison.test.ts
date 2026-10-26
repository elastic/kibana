/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { of } from 'rxjs';
import type { UnifiedHistogramChartProps } from '@kbn/unified-histogram';
import type { HistogramComparisonController } from '../../../../context_awareness/types';
import { fetchEsql } from '../../data_fetching/fetch_esql';
import { useHistogramComparison } from './use_histogram_comparison';

const mockPublish = jest.fn();
const mockController: HistogramComparisonController = {
  selection$: of({
    key: 'selection',
    label: 'user * logged in',
    column: 'Pattern',
    value: 'user * logged in',
    documentQuery: 'FROM logs | WHERE MATCH(message, "user logged in")',
  }),
};

jest.mock('../../../../hooks/use_discover_services', () => ({
  useDiscoverServices: () => ({ data: {}, expressions: {} }),
}));

jest.mock('../../../../components/scoped_services_provider', () => ({
  useScopedServices: () => ({ scopedProfilesManager: {} }),
}));

jest.mock('../../../../context_awareness', () => ({
  useProfileAccessor: () => () => mockPublish,
}));

jest.mock('../layout/histogram_comparison/use_histogram_comparison_state', () => ({
  ...jest.requireActual('../layout/histogram_comparison/use_histogram_comparison_state'),
  useHistogramComparisonController: () => mockController,
}));

jest.mock('../../data_fetching/fetch_esql', () => ({
  fetchEsql: jest.fn(),
}));

const mockFetchEsql = jest.mocked(fetchEsql);

const fetchParams = {
  dataSource: { kind: 'esql' },
  filters: [],
  timeRange: { from: 'now-15m', to: 'now' },
  esqlVariables: [],
  isApproximate: false,
  requestAdapter: undefined,
} as unknown as Parameters<
  NonNullable<UnifiedHistogramChartProps['comparison']>['loadCounts']
>[0]['fetchParams'];

const renderComparison = async () => {
  const { result } = renderHook(() =>
    useHistogramComparison({ query: { esql: 'FROM logs' }, defaultHistogramAvailable: true })
  );
  await waitFor(() => expect(result.current).toBeDefined());
  return result;
};

describe('useHistogramComparison', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchEsql.mockResolvedValue({
      records: [{ flattened: { 'time`bucket': 1, count: 3 } }],
    } as unknown as Awaited<ReturnType<typeof fetchEsql>>);
  });

  it('names the series generically and describes it with the selected pattern', async () => {
    const result = await renderComparison();

    expect(result.current?.label).toBe('Selected pattern');
    expect(result.current?.description).toBe('user * logged in');
  });

  it('quotes the time column and field when counting the selection', async () => {
    const result = await renderComparison();

    const counts = await result.current?.loadCounts({
      fetchParams,
      timeField: '@time`stamp',
      timeColumn: 'time`bucket',
      interval: '30 minute',
      signal: new AbortController().signal,
    });

    expect(mockFetchEsql.mock.lastCall?.[0].query).toEqual({
      esql: 'FROM logs | WHERE MATCH(message, "user logged in") | STATS count = COUNT(*) BY `time``bucket` = BUCKET(`@time``stamp`, 30 minute)',
    });
    expect(counts).toEqual([{ timestamp: 1, count: 3 }]);
  });

  it('clears the selection through the profile', async () => {
    const result = await renderComparison();

    result.current?.onClear();

    expect(mockPublish).toHaveBeenCalledWith(undefined);
  });
});
