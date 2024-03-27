/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeRange } from '@kbn/es-query';
import { BehaviorSubject, skip } from 'rxjs';
import { initializeTimeRange } from './initialize_time_range';

describe('initialize time range', () => {
  describe('appliedTimeRange$', () => {
    let timeRange: TimeRange | undefined;
    const parentApi = {
      timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
    };

    describe('local and parent time range', () => {
      beforeEach(() => {
        timeRange = {
          from: 'now-15m',
          to: 'now',
        };
        parentApi.timeRange$.next({
          from: 'now-24h',
          to: 'now',
        });
      });

      it('should return local time range', () => {
        const { appliedTimeRange$ } = initializeTimeRange({ timeRange }, parentApi);
        expect(appliedTimeRange$.value).toEqual({
          from: 'now-15m',
          to: 'now',
        });
      });

      it('should emit when local time range changes', async () => {
        let emitCount = 0;
        const { appliedTimeRange$, timeRangeApi } = initializeTimeRange({ timeRange }, parentApi);

        const subscribe = appliedTimeRange$.pipe(skip(1)).subscribe(() => {
          emitCount++;
        });

        timeRangeApi.setTimeRange({
          from: 'now-16m',
          to: 'now',
        });
        await new Promise(process.nextTick);

        expect(emitCount).toBe(1);
        expect(appliedTimeRange$.value).toEqual({
          from: 'now-16m',
          to: 'now',
        });

        subscribe.unsubscribe();
      });

      it('should not emit when parent time range changes', async () => {
        let emitCount = 0;
        const { appliedTimeRange$ } = initializeTimeRange({ timeRange }, parentApi);

        const subscribe = appliedTimeRange$.pipe(skip(1)).subscribe(() => {
          emitCount++;
        });

        parentApi.timeRange$.next({
          from: 'now-25h',
          to: 'now',
        });
        await new Promise(process.nextTick);

        expect(emitCount).toBe(0);
        expect(appliedTimeRange$.value).toEqual({
          from: 'now-15m',
          to: 'now',
        });

        subscribe.unsubscribe();
      });

      it('should emit parent time range when local time range is cleared', async () => {
        let emitCount = 0;
        const { appliedTimeRange$, timeRangeApi } = initializeTimeRange({ timeRange }, parentApi);

        const subscribe = appliedTimeRange$.pipe(skip(1)).subscribe(() => {
          emitCount++;
        });

        timeRangeApi.setTimeRange(undefined);
        await new Promise(process.nextTick);

        expect(emitCount).toBe(1);
        expect(appliedTimeRange$.value).toEqual({
          from: 'now-24h',
          to: 'now',
        });

        subscribe.unsubscribe();
      });
    });

    describe('only parent time range', () => {
      beforeEach(() => {
        timeRange = undefined;
        parentApi.timeRange$.next({
          from: 'now-24h',
          to: 'now',
        });
      });

      it('should return parent time range', () => {
        const { appliedTimeRange$ } = initializeTimeRange({ timeRange }, parentApi);
        expect(appliedTimeRange$.value).toEqual({
          from: 'now-24h',
          to: 'now',
        });
      });

      it('should emit when parent time range changes', async () => {
        let emitCount = 0;
        const { appliedTimeRange$ } = initializeTimeRange({ timeRange }, parentApi);

        const subscribe = appliedTimeRange$.pipe(skip(1)).subscribe(() => {
          emitCount++;
        });

        parentApi.timeRange$.next({
          from: 'now-25h',
          to: 'now',
        });
        await new Promise(process.nextTick);

        expect(emitCount).toBe(1);
        expect(appliedTimeRange$.value).toEqual({
          from: 'now-25h',
          to: 'now',
        });

        subscribe.unsubscribe();
      });
    });
  });
});
