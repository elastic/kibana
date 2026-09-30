/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useSortSelector } from './use_sort_selector';
import { METRICS_SORT_BY, METRICS_SORT_DIRECTION } from '../../../common/constants';
import type { MetricsSort } from '../../../types';

const renderSortSelector = (sort: MetricsSort) => {
  const onChange = jest.fn();
  const { result } = renderHook(() => useSortSelector({ sort, onChange }));
  return { result, onChange };
};

describe('useSortSelector', () => {
  it('forces ascending direction when switching to the recency field', () => {
    const { result, onChange } = renderSortSelector({
      sortField: METRICS_SORT_BY.alphabetically,
      sortDirection: METRICS_SORT_DIRECTION.desc,
    });

    result.current.handleSortByChange({
      value: METRICS_SORT_BY.recency,
      label: 'Recently explored',
    });

    expect(onChange).toHaveBeenCalledWith({
      sortField: METRICS_SORT_BY.recency,
      sortDirection: METRICS_SORT_DIRECTION.asc,
    });
  });

  it('preserves the current direction when switching to a non-recency field', () => {
    const { result, onChange } = renderSortSelector({
      sortField: METRICS_SORT_BY.recency,
      sortDirection: METRICS_SORT_DIRECTION.desc,
    });

    result.current.handleSortByChange({
      value: METRICS_SORT_BY.alphabetically,
      label: 'Alphabetically',
    });

    expect(onChange).toHaveBeenCalledWith({
      sortField: METRICS_SORT_BY.alphabetically,
      sortDirection: METRICS_SORT_DIRECTION.desc,
    });
  });

  it('falls back to the current field when no option is provided', () => {
    const { result, onChange } = renderSortSelector({
      sortField: METRICS_SORT_BY.alphabetically,
      sortDirection: METRICS_SORT_DIRECTION.asc,
    });

    result.current.handleSortByChange(undefined);

    expect(onChange).toHaveBeenCalledWith({
      sortField: METRICS_SORT_BY.alphabetically,
      sortDirection: METRICS_SORT_DIRECTION.asc,
    });
  });

  it('preserves the current field when the direction changes', () => {
    const { result, onChange } = renderSortSelector({
      sortField: METRICS_SORT_BY.alphabetically,
      sortDirection: METRICS_SORT_DIRECTION.asc,
    });

    result.current.handleDirectionChange(METRICS_SORT_DIRECTION.desc);

    expect(onChange).toHaveBeenCalledWith({
      sortField: METRICS_SORT_BY.alphabetically,
      sortDirection: METRICS_SORT_DIRECTION.desc,
    });
  });

  it('marks the current sort field as checked', () => {
    const { result } = renderSortSelector({
      sortField: METRICS_SORT_BY.alphabetically,
      sortDirection: METRICS_SORT_DIRECTION.asc,
    });

    const selected = result.current.options.find(
      (option) => option.value === METRICS_SORT_BY.alphabetically
    );

    expect(selected?.checked).toBe('on');
  });

  it('emits stable telemetry attributes for sort options', () => {
    const { result } = renderSortSelector({
      sortField: METRICS_SORT_BY.alphabetically,
      sortDirection: METRICS_SORT_DIRECTION.asc,
    });

    const ebtProps = result.current.options.map((option) => {
      const attrs = option as {
        'data-ebt-action'?: string;
        'data-ebt-element'?: string;
        'data-ebt-detail'?: string;
      };
      return {
        action: attrs['data-ebt-action'],
        element: attrs['data-ebt-element'],
        detail: attrs['data-ebt-detail'],
      };
    });

    // These are telemetry values - changing them breaks historical analysis.
    expect(ebtProps).toEqual([
      { action: 'setSortOption', element: 'chartsToolbar', detail: 'alphabetically' },
      { action: 'setSortOption', element: 'chartsToolbar', detail: 'recency' },
    ]);
  });
});
