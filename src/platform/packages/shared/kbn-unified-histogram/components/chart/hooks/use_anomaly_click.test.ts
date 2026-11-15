/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { UnifiedHistogramServices } from '../../../types';
import type { UnifiedHistogramAnomalyRange } from '../../../utils/anomaly_overlay';
import { useAnomalyClick } from './use_anomaly_click';

const START = Date.parse('2026-01-01T00:00:00.000Z');
const ranges: UnifiedHistogramAnomalyRange[] = [
  { jobId: 'my-job', start: START, end: START + 3600000, score: 73 },
  { jobId: 'my-job', start: START + 7200000, end: START + 10800000, score: 20 },
];

describe('useAnomalyClick', () => {
  const executeTriggerActions = jest.fn().mockResolvedValue(undefined);
  const services = { uiActions: { executeTriggerActions } } as unknown as UnifiedHistogramServices;
  const click = (...times: string[]) => ({
    annotations: times.map((time) => ({ id: 'a', type: 'range' as const, time, label: '' })),
    preventDefault: jest.fn(),
  });
  const setup = (rangesToUse = ranges) =>
    renderHook(() => useAnomalyClick({ services, ranges: rangesToUse })).result.current;

  beforeEach(() => executeTriggerActions.mockClear());

  it('triggers the action with the job, time and score of the clicked anomaly', () => {
    setup()(click('2026-01-01T02:00:00.000Z'));
    expect(executeTriggerActions).toHaveBeenCalledWith('DISCOVER_AD_ANOMALY_TRIGGER', {
      jobId: 'my-job',
      timestamp: START + 7200000,
      endTimestamp: START + 10800000,
      score: 20,
    });
  });

  it('does nothing when the click is not on an anomaly', () => {
    setup()(click('2026-01-01T01:00:00.000Z'));
    expect(executeTriggerActions).not.toHaveBeenCalled();
  });

  it('does nothing when the anomaly has no job', () => {
    setup([{ start: START, end: START + 1, score: 10 }])(click('2026-01-01T00:00:00.000Z'));
    expect(executeTriggerActions).not.toHaveBeenCalled();
  });

  it('does nothing when there are no anomalies', () => {
    setup([])(click('2026-01-01T00:00:00.000Z'));
    expect(executeTriggerActions).not.toHaveBeenCalled();
  });

  it('is the same handler when the anomalies change, and uses the latest', () => {
    const { result, rerender } = renderHook(
      ({ current }) => useAnomalyClick({ services, ranges: current }),
      { initialProps: { current: [] as UnifiedHistogramAnomalyRange[] } }
    );
    const first = result.current;
    rerender({ current: ranges });
    expect(result.current).toBe(first);
    result.current(click('2026-01-01T00:00:00.000Z'));
    expect(executeTriggerActions).toHaveBeenCalledTimes(1);
  });
});
