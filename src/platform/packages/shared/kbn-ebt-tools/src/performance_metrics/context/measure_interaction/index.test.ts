/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { perfomanceMarkers } from '../../performance_markers';

// Mock @kbn/timerange module
const mockGetDateRange = jest.fn();
const mockGetTimeDifferenceInSeconds = jest.fn();
const mockGetOffsetFromNowInSeconds = jest.fn();

jest.mock('@kbn/timerange', () => ({
  getDateRange: (...args: unknown[]) => mockGetDateRange(...args),
  getTimeDifferenceInSeconds: (...args: unknown[]) => mockGetTimeDifferenceInSeconds(...args),
  getOffsetFromNowInSeconds: (...args: unknown[]) => mockGetOffsetFromNowInSeconds(...args),
}));

// Import after mocking
import { measureInteraction } from '.';

// Mock the performance API
const mockMark = jest.fn();
const mockMeasure = jest.fn();
const mockClearMarks = jest.fn();
const mockGetEntriesByName = jest.fn();

describe('measureInteraction', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'performance', {
      value: {
        mark: mockMark,
        measure: mockMeasure,
        clearMarks: mockClearMarks,
        getEntriesByName: mockGetEntriesByName,
      },
      writable: true,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pageReady', () => {
    it('should not throw when getDateRange throws due to invalid date range', () => {
      // Mock getDateRange to throw an error (simulating start > end scenario)
      mockGetDateRange.mockImplementation(() => {
        throw new Error('Invalid Dates: from: now-51s, to: 2024-01-01T00:00:00.000Z');
      });

      mockGetEntriesByName.mockImplementation((marker) => {
        if (
          marker === perfomanceMarkers.startPageChange ||
          marker === perfomanceMarkers.endPageReady
        ) {
          return [{ name: marker, startTime: 0 }];
        }
        return [];
      });

      const tracker = measureInteraction('/test-path');

      // Should not throw - telemetry code should be defensive
      expect(() => {
        tracker.pageReady({
          meta: {
            rangeFrom: 'now-51s',
            rangeTo: '2024-01-01T00:00:00.000Z',
          },
        });
      }).not.toThrow();

      // Verify that performance.measure was still called (measure itself should succeed)
      expect(mockMeasure).toHaveBeenCalled();
    });

    it('should include date range metadata when getDateRange succeeds', () => {
      const mockDateRange = {
        startDate: Date.now() - 60000, // 1 minute ago
        endDate: Date.now(),
      };

      mockGetDateRange.mockReturnValue(mockDateRange);
      mockGetTimeDifferenceInSeconds.mockReturnValue(60);
      mockGetOffsetFromNowInSeconds.mockReturnValue(-30);

      mockGetEntriesByName.mockImplementation((marker) => {
        if (
          marker === perfomanceMarkers.startPageChange ||
          marker === perfomanceMarkers.endPageReady
        ) {
          return [{ name: marker, startTime: 0 }];
        }
        return [];
      });

      const tracker = measureInteraction('/test-path');

      tracker.pageReady({
        meta: {
          rangeFrom: 'now-1m',
          rangeTo: 'now',
        },
      });

      // Verify performance.measure was called with the date range metadata
      expect(mockMeasure).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          detail: expect.objectContaining({
            meta: expect.objectContaining({
              queryRangeSecs: 60,
            }),
          }),
        })
      );
    });

    it('should not include date range metadata when rangeFrom or rangeTo is missing', () => {
      mockGetEntriesByName.mockImplementation((marker) => {
        if (
          marker === perfomanceMarkers.startPageChange ||
          marker === perfomanceMarkers.endPageReady
        ) {
          return [{ name: marker, startTime: 0 }];
        }
        return [];
      });

      const tracker = measureInteraction('/test-path');

      tracker.pageReady({
        meta: {},
      });

      // Verify performance.measure was called without date range metadata
      expect(mockMeasure).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          detail: expect.objectContaining({
            meta: expect.not.objectContaining({
              queryRangeSecs: expect.any(Number),
            }),
          }),
        })
      );
    });
  });
});
