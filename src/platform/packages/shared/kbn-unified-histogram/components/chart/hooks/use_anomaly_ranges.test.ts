/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { Subject } from 'rxjs';
import type { DataSource } from '@kbn/data-source';
import type {
  UnifiedHistogramFetch$,
  UnifiedHistogramFetch$Arguments,
  UnifiedHistogramServices,
} from '../../../types';
import { useAnomalyRanges } from './use_anomaly_ranges';

const dataSource = {
  kind: 'esql',
  title: 'logs-*',
  timeFieldName: '@timestamp',
} as unknown as DataSource;

describe('useAnomalyRanges', () => {
  const executeTriggerActions = jest.fn().mockResolvedValue(undefined);
  const services = {
    uiActions: { executeTriggerActions },
    data: {
      query: {
        timefilter: {
          timefilter: {
            calculateBounds: () => ({
              min: { valueOf: () => 0 },
              max: { valueOf: () => 1000 },
            }),
          },
        },
      },
    },
  } as unknown as UnifiedHistogramServices;

  const setup = () => {
    const fetch$ = new Subject<UnifiedHistogramFetch$Arguments>();
    const { result } = renderHook(() =>
      useAnomalyRanges({
        services,
        dataSource,
        fetch$: fetch$ as unknown as UnifiedHistogramFetch$,
      })
    );
    const fetch = () => {
      act(() =>
        fetch$.next({
          fetchParams: { timeRange: { from: 'now-1h', to: 'now' } },
        } as unknown as UnifiedHistogramFetch$Arguments)
      );
      return executeTriggerActions.mock.lastCall[1];
    };
    const context = fetch();
    return { result, context, fetch };
  };

  beforeEach(() => executeTriggerActions.mockClear());

  it('asks for the anomalies of the index pattern in the time range of the chart', () => {
    const { result } = setup();

    expect(executeTriggerActions).toHaveBeenCalledWith(
      'DISCOVER_AD_ANOMALIES_TRIGGER',
      expect.objectContaining({ indexPattern: 'logs-*', timeRange: { from: 0, to: 1000 } })
    );
    expect(result.current).toEqual({ overlay: undefined, jobSelection: undefined });
  });

  it('returns the anomalies and the selected job which are provided', () => {
    const { result, context } = setup();
    const setShowAnomalies = jest.fn();

    act(() => {
      context.onAnomalyRanges([{ jobId: 'a', start: 0, end: 10, score: 50 }]);
      context.onJobSelection({ jobId: 'a', showAnomalies: true, setShowAnomalies });
    });

    expect(result.current.overlay).toEqual({
      ranges: [{ jobId: 'a', start: 0, end: 10, score: 50 }],
      timeRange: { from: 0, to: 1000 },
    });
    expect(result.current.jobSelection).toEqual({
      jobId: 'a',
      showAnomalies: true,
      setShowAnomalies,
    });
  });

  it('ignores what is provided for a fetch which was replaced', () => {
    const { result, context, fetch } = setup();
    fetch();

    act(() => {
      context.onJobSelection({ jobId: 'old', showAnomalies: true, setShowAnomalies: jest.fn() });
    });

    expect(context.signal.aborted).toBe(true);
    expect(result.current.jobSelection).toBeUndefined();
  });
});
