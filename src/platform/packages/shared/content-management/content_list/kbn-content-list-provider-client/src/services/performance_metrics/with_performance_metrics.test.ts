/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import { withPerformanceMetrics } from './with_performance_metrics';

jest.mock('@kbn/ebt-tools', () => ({
  reportPerformanceMetricEvent: jest.fn(),
}));

describe('withPerformanceMetrics', () => {
  const analytics = {} as AnalyticsServiceStart;

  beforeEach(() => {
    jest.clearAllMocks();
    let now = 0;
    jest.spyOn(window.performance, 'now').mockImplementation(() => {
      const value = now;
      now += 250;
      return value;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("reports the wrapped call's elapsed duration with the supplied event name and saved object type", async () => {
    const search = jest.fn().mockResolvedValue({ total: 0, hits: [] });

    const wrapped = withPerformanceMetrics(search, {
      analytics,
      eventName: 'saved_object_loaded',
      savedObjectType: 'dashboard',
    });

    await wrapped('query', { listingLimit: 100 });

    expect(reportPerformanceMetricEvent).toHaveBeenCalledTimes(1);
    expect(reportPerformanceMetricEvent).toHaveBeenCalledWith(analytics, {
      eventName: 'saved_object_loaded',
      duration: 250,
      meta: { saved_object_type: 'dashboard' },
    });
  });

  it('passes the wrapped function arguments through and returns its resolved value', async () => {
    const result = { total: 1, hits: [{ id: 'a' }] };
    const search = jest.fn().mockResolvedValue(result);

    const wrapped = withPerformanceMetrics(search, {
      analytics,
      eventName: 'saved_object_loaded',
      savedObjectType: 'dashboard',
    });

    await expect(wrapped('q', { listingLimit: 50 })).resolves.toBe(result);
    expect(search).toHaveBeenCalledWith('q', { listingLimit: 50 });
  });

  it('merges per-call `meta` from the options callback into the EBT event', async () => {
    const del = jest.fn().mockResolvedValue(undefined);

    const wrapped = withPerformanceMetrics(del, {
      analytics,
      eventName: 'saved_object_deleted',
      savedObjectType: 'dashboard',
      meta: ([items]) => ({ total: (items as unknown[]).length }),
    });

    await wrapped([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);

    expect(reportPerformanceMetricEvent).toHaveBeenCalledWith(analytics, {
      eventName: 'saved_object_deleted',
      duration: 250,
      meta: { saved_object_type: 'dashboard', total: 3 },
    });
  });

  it('does not report when the wrapped function throws', async () => {
    const search = jest.fn().mockRejectedValue(new Error('boom'));

    const wrapped = withPerformanceMetrics(search, {
      analytics,
      eventName: 'saved_object_loaded',
      savedObjectType: 'dashboard',
    });

    await expect(wrapped('q')).rejects.toThrow('boom');
    expect(reportPerformanceMetricEvent).not.toHaveBeenCalled();
  });
});
