/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computeInterval } from './compute_interval';

describe('computeInterval', () => {
  const fixedDate = new Date('2023-10-24T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('with absolute time ranges', () => {
    it('should return correct interval for 24 hours timerange', () => {
      expect(
        computeInterval({
          from: '2023-08-15T10:00:00.000Z',
          to: '2023-08-16T10:17:34.591Z',
        })
      ).toEqual('30 minute');
    });

    it('should return correct interval for 7 days timerange', () => {
      expect(
        computeInterval({
          from: '2023-08-08T21:00:00.000Z',
          to: '2023-08-16T10:18:56.569Z',
        })
      ).toEqual('3 hour');
    });

    it('should return correct interval for 1 month timerange', () => {
      expect(
        computeInterval({
          from: '2023-07-16T21:00:00.000Z',
          to: '2023-08-16T10:19:43.573Z',
        })
      ).toEqual('12 hour');
    });

    it('should return correct interval for 1 year timerange', () => {
      expect(
        computeInterval({
          from: '2022-08-15T21:00:00.000Z',
          to: '2023-08-16T10:21:18.589Z',
        })
      ).toEqual('1 week');
    });
  });

  describe('with custom histogramBarTarget', () => {
    it('should return correct interval for 24 hours timerange', () => {
      expect(
        computeInterval(
          {
            from: '2023-08-15T10:00:00.000Z',
            to: '2023-08-16T10:17:34.591Z',
          },
          100
        )
      ).toEqual('10 minute');
    });

    it('should return correct interval for 7 days timerange', () => {
      expect(
        computeInterval(
          {
            from: '2023-08-08T21:00:00.000Z',
            to: '2023-08-16T10:18:56.569Z',
          },
          100
        )
      ).toEqual('1 hour');
    });

    it('should return correct interval for 1 month timerange', () => {
      expect(
        computeInterval(
          {
            from: '2023-07-16T21:00:00.000Z',
            to: '2023-08-16T10:19:43.573Z',
          },
          500
        )
      ).toEqual('1 hour');
    });

    it('should return correct interval for 1 year timerange', () => {
      expect(
        computeInterval(
          {
            from: '2022-08-15T21:00:00.000Z',
            to: '2023-08-16T10:21:18.589Z',
          },
          500
        )
      ).toEqual('12 hour');
    });
  });
});
