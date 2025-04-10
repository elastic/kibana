/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TimeRange } from '@kbn/es-query';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { act, renderHook } from '@testing-library/react';
import { Observable } from 'rxjs';
import { getAbsoluteTimeRange } from '../../../common';
import { NowProvider } from '../../now_provider';
import { TimeHistory } from './time_history';
import { Timefilter } from './timefilter';
import { TimeStateUpdate, TimefilterHook } from './use_timefilter';

const now = new Date('2025-04-02T00:00:00.000Z');

describe('createUseTimefilterHook', () => {
  let useTimefilter: () => TimefilterHook;
  let timefilter: Timefilter;

  const timeDefaults = {
    from: 'now-15m',
    to: 'now',
  };

  async function setTimeAndWait(input: TimeRange) {
    const {
      result: { current },
    } = renderHook(() => useTimefilter());
    return await act(async () => {
      return await waitForNextFetch$(current.timeState$, () => {
        timefilter.setTime(input);
      });
    });
  }

  async function refreshAndWait() {
    const {
      result: { current },
    } = renderHook(() => useTimefilter());
    return await act(async () => {
      return await waitForNextFetch$(current.timeState$, () => {
        current.refresh();
      });
    });
  }

  async function waitForNextFetch$(timeState$: Observable<TimeStateUpdate>, cb: () => void) {
    return await new Promise<TimeStateUpdate>((resolve) => {
      const subscription = timeState$.subscribe({
        next: (val) => {
          subscription.unsubscribe();
          resolve(val);
        },
      });
      cb();
    });
  }

  beforeEach(() => {
    const storage = new Storage(window.localStorage);

    const timeHistory = new TimeHistory(storage);

    const nowProvider = new NowProvider();

    nowProvider.set(now);

    timefilter = new Timefilter(
      {
        timeDefaults,
        refreshIntervalDefaults: {
          pause: false,
          value: 0,
        },
        minRefreshIntervalDefault: 10,
      },
      timeHistory,
      nowProvider
    );

    useTimefilter = timefilter.useTimefilter;
  });

  describe('initially', () => {
    it('should return the initial time state based on the timefilter.getTime() value', () => {
      const { result } = renderHook(() => useTimefilter());

      expect(result.current.timeState).toEqual({
        asAbsoluteTimeRange: {
          ...getAbsoluteTimeRange(timeDefaults, { forceNow: now }),
          mode: 'absolute',
        },
        start: now.getTime() - 15 * 60 * 1000,
        end: now.getTime(),
        timeRange: timeDefaults,
      });
    });
  });

  describe('when updating via setTime', () => {
    it('updates the time with a relative change', async () => {
      const next = await setTimeAndWait({
        from: 'now-30m',
        to: 'now',
      });

      expect(next.timeState).toEqual({
        asAbsoluteTimeRange: {
          ...getAbsoluteTimeRange({ from: 'now-30m', to: 'now' }, { forceNow: now }),
          mode: 'absolute',
        },
        start: now.getTime() - 30 * 60 * 1000,
        end: now.getTime(),
        timeRange: {
          from: 'now-30m',
          to: 'now',
        },
      });

      expect(next.kind).toBe('shift');
    });

    it('updates the time with an absolute change', async () => {
      const start = new Date(`2025-04-03T00:00:00.000Z`);
      const end = new Date(`2025-04-04T00:00:00.000Z`);

      const next = await setTimeAndWait({ from: start.toISOString(), to: end.toISOString() });

      expect(next.timeState).toEqual({
        asAbsoluteTimeRange: {
          ...getAbsoluteTimeRange(
            { from: start.toISOString(), to: end.toISOString() },
            { forceNow: now }
          ),
          mode: 'absolute',
        },
        start: start.getTime(),
        end: end.getTime(),
        timeRange: {
          from: start.toISOString(),
          to: end.toISOString(),
        },
      });
      expect(next.kind).toBe('shift');
    });

    it('calls timeState$ when refreshing a static time range', async () => {
      const start = new Date(`2025-04-03T00:00:00.000Z`);
      const end = new Date(`2025-04-04T00:00:00.000Z`);

      const next = await setTimeAndWait({ from: start.toISOString(), to: end.toISOString() });

      const afterNext = await refreshAndWait();

      expect(afterNext.timeState).toEqual(next.timeState);

      expect(next.kind).toEqual('shift');
      expect(afterNext.kind).toEqual('override');
    });
  });
});
