/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { getFetch$Mock, getFetchParamsMock } from '@kbn/unified-histogram/__mocks__/fetch_params';
import { useRecentlyExploredMetrics } from './use_recently_explored_metrics';
import {
  DEFAULT_METRICS_SORT,
  METRICS_SORT_BY,
  METRICS_SORT_DIRECTION,
} from '../../../../common/constants';
import type { Dimension, MetricsSort } from '../../../../types';

describe('useRecentlyExploredMetrics', () => {
  const render = (
    getRecentlyExploredMetrics: () => readonly string[],
    initialProps?: Partial<{
      metricsSort: MetricsSort;
      searchTerm: string;
      selectedDimensions: Dimension[];
    }>
  ) => {
    const discoverFetch$ = getFetch$Mock();
    const { result, rerender } = renderHook(
      (props: { metricsSort: MetricsSort; searchTerm: string; selectedDimensions: Dimension[] }) =>
        useRecentlyExploredMetrics({
          getRecentlyExploredMetrics,
          discoverFetch$,
          ...props,
        }),
      {
        initialProps: {
          metricsSort: DEFAULT_METRICS_SORT,
          searchTerm: '',
          selectedDimensions: [],
          ...initialProps,
        },
      }
    );
    return { result, rerender, discoverFetch$ };
  };

  it('reads the recency snapshot on mount', () => {
    const { result } = render(() => ['metrics-*::cpu']);

    expect(result.current).toEqual(['metrics-*::cpu']);
  });

  it('re-reads when the sort changes', () => {
    let stored: string[] = ['metrics-*::cpu'];
    const { result, rerender } = render(() => stored);

    stored = ['metrics-*::memory', 'metrics-*::cpu'];
    act(() => {
      rerender({
        metricsSort: [METRICS_SORT_BY.recency, METRICS_SORT_DIRECTION.desc],
        searchTerm: '',
        selectedDimensions: [],
      });
    });

    expect(result.current).toEqual(['metrics-*::memory', 'metrics-*::cpu']);
  });

  it('re-reads when the search term changes', () => {
    let stored: string[] = [];
    const { result, rerender } = render(() => stored);

    stored = ['metrics-*::cpu'];
    act(() => {
      rerender({
        metricsSort: DEFAULT_METRICS_SORT,
        searchTerm: 'cpu',
        selectedDimensions: [],
      });
    });

    expect(result.current).toEqual(['metrics-*::cpu']);
  });

  it('re-reads when the dimensions change', () => {
    let stored: string[] = [];
    const { result, rerender } = render(() => stored);

    stored = ['metrics-*::cpu'];
    act(() => {
      rerender({
        metricsSort: DEFAULT_METRICS_SORT,
        searchTerm: '',
        selectedDimensions: [{ name: 'host.name' }],
      });
    });

    expect(result.current).toEqual(['metrics-*::cpu']);
  });

  it('re-reads when the Discover fetch emits', () => {
    let stored: string[] = [];
    const { result, discoverFetch$ } = render(() => stored);

    stored = ['metrics-*::cpu'];
    act(() => {
      discoverFetch$.next({ fetchParams: getFetchParamsMock(), lensVisServiceState: undefined });
    });

    expect(result.current).toEqual(['metrics-*::cpu']);
  });

  it('keeps a stable reference when the list is unchanged', () => {
    const stored = ['metrics-*::cpu'];
    const { result, rerender } = render(() => stored);
    const initial = result.current;

    act(() => {
      rerender({
        metricsSort: [METRICS_SORT_BY.recency, METRICS_SORT_DIRECTION.desc],
        searchTerm: '',
        selectedDimensions: [],
      });
    });

    // Same content read again should not produce a new reference (no re-render churn).
    expect(result.current).toBe(initial);
  });
});
