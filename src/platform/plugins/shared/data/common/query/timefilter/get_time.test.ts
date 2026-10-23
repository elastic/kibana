/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RangeFilter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import moment from 'moment';
import sinon from 'sinon';
import { calculateBounds, getTime, getRelativeTime, getAbsoluteTimeRange } from './get_time';

describe('get_time', () => {
  describe('getTime', () => {
    test('build range filter in iso format', () => {
      const clock = sinon.useFakeTimers(moment.utc([2000, 1, 1, 0, 0, 0, 0]).valueOf());

      const filter = getTime(
        {
          id: 'test',
          title: 'test',
          timeFieldName: 'date',
          fields: [
            {
              name: 'date',
              type: 'date',
              esTypes: ['date'],
              aggregatable: true,
              searchable: true,
              filterable: true,
            },
          ],
        } as unknown as DataView,
        { from: 'now-60y', to: 'now' }
      ) as RangeFilter;
      expect(filter.query.range.date).toEqual({
        gte: '1940-02-01T00:00:00.000Z',
        lte: '2000-02-01T00:00:00.000Z',
        format: 'strict_date_optional_time',
      });
      clock.restore();
    });

    test('build range filter for non-primary field', () => {
      const clock = sinon.useFakeTimers(moment.utc([2000, 1, 1, 0, 0, 0, 0]).valueOf());

      const filter = getTime(
        {
          id: 'test',
          title: 'test',
          timeFieldName: 'date',
          fields: [
            {
              name: 'date',
              type: 'date',
              esTypes: ['date'],
              aggregatable: true,
              searchable: true,
              filterable: true,
            },
            {
              name: 'myCustomDate',
              type: 'date',
              esTypes: ['date'],
              aggregatable: true,
              searchable: true,
              filterable: true,
            },
          ],
        } as unknown as DataView,
        { from: 'now-60y', to: 'now' },
        { fieldName: 'myCustomDate' }
      ) as RangeFilter;
      expect(filter.query.range.myCustomDate).toEqual({
        gte: '1940-02-01T00:00:00.000Z',
        lte: '2000-02-01T00:00:00.000Z',
        format: 'strict_date_optional_time',
      });
      clock.restore();
    });

    test('build range filter when a data view is omitted', () => {
      const filter = getTime(
        undefined,
        { from: 'now-60y', to: 'now' },
        { fieldName: 'something' }
      ) as RangeFilter;

      expect(filter).toHaveProperty(
        'query.range.something',
        expect.objectContaining({
          gte: expect.any(String),
          lte: expect.any(String),
          format: 'strict_date_optional_time',
        })
      );
    });
  });
  describe('getRelativeTime', () => {
    test('do not coerce relative time to absolute time when given flag', () => {
      const filter = getRelativeTime(
        {
          id: 'test',
          title: 'test',
          timeFieldName: 'date',
          fields: [
            {
              name: 'date',
              type: 'date',
              esTypes: ['date'],
              aggregatable: true,
              searchable: true,
              filterable: true,
            },
            {
              name: 'myCustomDate',
              type: 'date',
              esTypes: ['date'],
              aggregatable: true,
              searchable: true,
              filterable: true,
            },
          ],
        } as unknown as DataView,
        { from: 'now-60y', to: 'now' },
        { fieldName: 'myCustomDate' }
      ) as RangeFilter;

      expect(filter.query.range.myCustomDate).toEqual({
        gte: 'now-60y',
        lte: 'now',
        format: 'strict_date_optional_time',
      });
    });
    test('do not coerce relative time to absolute time when given flag - with mixed from and to times', () => {
      const clock = sinon.useFakeTimers(moment.utc().valueOf());
      const filter = getRelativeTime(
        {
          id: 'test',
          title: 'test',
          timeFieldName: 'date',
          fields: [
            {
              name: 'date',
              type: 'date',
              esTypes: ['date'],
              aggregatable: true,
              searchable: true,
              filterable: true,
            },
            {
              name: 'myCustomDate',
              type: 'date',
              esTypes: ['date'],
              aggregatable: true,
              searchable: true,
              filterable: true,
            },
          ],
        } as unknown as DataView,
        {
          from: '2020-09-01T08:30:00.000Z',
          to: 'now',
        },
        { fieldName: 'myCustomDate' }
      ) as RangeFilter;

      expect(filter.query.range.myCustomDate).toEqual({
        gte: '2020-09-01T08:30:00.000Z',
        lte: 'now',
        format: 'strict_date_optional_time',
      });
      clock.restore();
    });
  });
  describe('getAbsoluteTimeRange', () => {
    test('should forward absolute timerange as is', () => {
      const from = '2000-01-01T00:00:00.000Z';
      const to = '2000-02-01T00:00:00.000Z';
      expect(getAbsoluteTimeRange({ from, to })).toEqual({ from, to });
    });

    test('should convert relative to absolute', () => {
      const clock = sinon.useFakeTimers(moment.utc([2000, 1, 0, 0, 0, 0, 0]).valueOf());
      const from = '2000-01-01T00:00:00.000Z';
      const to = moment.utc(clock.now).toISOString();
      expect(getAbsoluteTimeRange({ from, to: 'now' })).toEqual({ from, to });
      clock.restore();
    });

    test('should handle moments', () => {
      const clock = sinon.useFakeTimers(moment.utc([2000, 1, 0, 0, 0, 0, 0]).valueOf());
      const from = '2000-01-01T00:00:00.000Z';
      const to = moment.utc(clock.now).toISOString();
      expect(getAbsoluteTimeRange({ from, to: 'now' })).toEqual({ from, to });
      clock.restore();
    });
  });

  describe('calculateBounds', () => {
    const forceNow = new Date('2026-10-22T12:34:56.789Z');

    beforeAll(() => {
      moment.tz.setDefault('UTC');
    });

    afterAll(() => {
      moment.tz.setDefault('Browser');
    });

    test('truncates "now" to the last whole second', () => {
      const { min, max } = calculateBounds({ from: 'now-15m', to: 'now' }, { forceNow });
      expect(min?.toISOString()).toBe('2026-10-22T12:19:56.000Z');
      expect(max?.toISOString()).toBe('2026-10-22T12:34:56.000Z');
    });

    test('ends rounded-up relative bounds on the last whole second', () => {
      const { min, max } = calculateBounds({ from: 'now/d', to: 'now/d' }, { forceNow });
      expect(min?.toISOString()).toBe('2026-10-22T00:00:00.000Z');
      expect(max?.toISOString()).toBe('2026-10-22T23:59:59.000Z');
    });

    test('keeps milliseconds when a bound uses the ms unit', () => {
      const { min, max } = calculateBounds({ from: 'now-500ms', to: 'now/d' }, { forceNow });
      expect(min?.toISOString()).toBe('2026-10-22T12:34:56.289Z');
      expect(max?.toISOString()).toBe('2026-10-22T23:59:59.999Z');
    });

    test('keeps millisecond precision on absolute bounds', () => {
      const { min, max } = calculateBounds(
        { from: '2026-10-21T01:02:03.456Z', to: '2026-10-21T04:05:06.789Z' },
        { forceNow }
      );
      expect(min?.toISOString()).toBe('2026-10-21T01:02:03.456Z');
      expect(max?.toISOString()).toBe('2026-10-21T04:05:06.789Z');
    });

    test('rounds the clock time when forceNow is omitted', () => {
      const clock = sinon.useFakeTimers(forceNow.valueOf());
      const { max } = calculateBounds({ from: 'now-15m', to: 'now' });
      expect(max?.toISOString()).toBe('2026-10-22T12:34:56.000Z');
      clock.restore();
    });
  });

  test('getTime and getAbsoluteTimeRange resolve the same rounded bounds', () => {
    const forceNow = new Date('2026-10-22T12:34:56.789Z');
    const timeRange = { from: 'now/w', to: 'now/w' };
    const filter = getTime(undefined, timeRange, { forceNow, fieldName: 'date' }) as RangeFilter;
    const { from, to } = getAbsoluteTimeRange(timeRange, { forceNow });
    expect(filter.query.range.date).toEqual(expect.objectContaining({ gte: from, lte: to }));
  });
});
