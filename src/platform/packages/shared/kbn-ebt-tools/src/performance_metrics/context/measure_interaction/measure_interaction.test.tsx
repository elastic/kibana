/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { measureInteraction } from '.';
import { perfomanceMarkers } from '../../performance_markers';

describe('measureInteraction', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Initial load', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      performance.mark = jest.fn();
      performance.measure = jest.fn();

      performance.getEntriesByName = jest
        .fn()
        .mockReturnValueOnce([{ name: 'start::pageChange' }])
        .mockReturnValueOnce([{ name: 'end::pageReady' }])
        .mockReturnValueOnce([]);
      performance.clearMarks = jest.fn();
    });

    it('should mark the start of the page change', () => {
      const pathname = '/test-path';
      measureInteraction(pathname);
      expect(performance.mark).toHaveBeenCalledWith(perfomanceMarkers.startPageChange);
    });

    it('should mark the end of the page ready state and measure performance', () => {
      const pathname = '/test-path';
      const interaction = measureInteraction(pathname);

      interaction.pageReady();

      expect(performance.mark).toHaveBeenCalledWith(perfomanceMarkers.endPageReady);
      expect(performance.measure).toHaveBeenCalledWith(`[ttfmp:initial] - ${pathname}`, {
        detail: {
          customMetrics: undefined,
          eventName: 'kibana:plugin_render_time',
          type: 'kibana:performance',
          meta: {
            isInitialLoad: true,
          },
        },
        start: perfomanceMarkers.startPageChange,
        end: perfomanceMarkers.endPageReady,
      });
    });

    it('should include custom metrics and meta in the performance measure', () => {
      const pathname = '/test-path';
      const interaction = measureInteraction(pathname);
      const eventData = {
        customMetrics: { key1: 'foo-metric', value1: 100 },
        meta: { rangeFrom: 'now-15m', rangeTo: 'now' },
      };

      interaction.pageReady(eventData);

      expect(performance.mark).toHaveBeenCalledWith(perfomanceMarkers.endPageReady);
      expect(performance.measure).toHaveBeenCalledWith(`[ttfmp:initial] - ${pathname}`, {
        detail: {
          eventName: 'kibana:plugin_render_time',
          type: 'kibana:performance',
          customMetrics: eventData.customMetrics,
          meta: {
            queryRangeSecs: 900,
            queryFromOffsetSecs: -900,
            queryToOffsetSecs: 0,
            isInitialLoad: true,
          },
        },
        end: 'end::pageReady',
        start: 'start::pageChange',
      });
    });

    it('should handle absolute date format correctly', () => {
      const pathname = '/test-path';
      const interaction = measureInteraction(pathname);
      jest.spyOn(global.Date, 'now').mockReturnValue(1733704200000); // 2024-12-09T00:30:00Z

      const eventData = {
        meta: { rangeFrom: '2024-12-09T00:00:00Z', rangeTo: '2024-12-09T00:30:00Z' },
      };

      interaction.pageReady(eventData);

      expect(performance.mark).toHaveBeenCalledWith(perfomanceMarkers.endPageReady);
      expect(performance.measure).toHaveBeenCalledWith(`[ttfmp:initial] - ${pathname}`, {
        detail: {
          eventName: 'kibana:plugin_render_time',
          type: 'kibana:performance',
          customMetrics: undefined,
          meta: {
            queryRangeSecs: 1800,
            queryFromOffsetSecs: -1800,
            queryToOffsetSecs: 0,
            isInitialLoad: true,
          },
        },
        end: 'end::pageReady',
        start: 'start::pageChange',
      });
    });

    it('should handle negative offset when rangeTo is in the past', () => {
      const pathname = '/test-path';
      const interaction = measureInteraction(pathname);
      jest.spyOn(global.Date, 'now').mockReturnValue(1733704200000); // 2024-12-09T00:30:00Z

      const eventData = {
        meta: { rangeFrom: '2024-12-08T00:00:00Z', rangeTo: '2024-12-09T00:00:00Z' },
      };

      interaction.pageReady(eventData);

      expect(performance.mark).toHaveBeenCalledWith(perfomanceMarkers.endPageReady);
      expect(performance.measure).toHaveBeenCalledWith(`[ttfmp:initial] - ${pathname}`, {
        detail: {
          eventName: 'kibana:plugin_render_time',
          type: 'kibana:performance',
          customMetrics: undefined,
          meta: {
            queryRangeSecs: 86400,
            queryFromOffsetSecs: -88200,
            queryToOffsetSecs: -1800,
            isInitialLoad: true,
          },
        },
        end: 'end::pageReady',
        start: 'start::pageChange',
      });
    });

    it('should handle positive offset when rangeTo is in the future', () => {
      const pathname = '/test-path';

      const interaction = measureInteraction(pathname);
      jest.spyOn(global.Date, 'now').mockReturnValue(1733704200000); // 2024-12-09T00:30:00Z

      const eventData = {
        meta: { rangeFrom: '2024-12-08T01:00:00Z', rangeTo: '2024-12-09T01:00:00Z' },
      };

      interaction.pageReady(eventData);

      expect(performance.mark).toHaveBeenCalledWith(perfomanceMarkers.endPageReady);
      expect(performance.measure).toHaveBeenCalledWith(`[ttfmp:initial] - ${pathname}`, {
        detail: {
          eventName: 'kibana:plugin_render_time',
          type: 'kibana:performance',
          customMetrics: undefined,
          meta: {
            queryRangeSecs: 86400,
            queryFromOffsetSecs: -84600,
            queryToOffsetSecs: 1800,
            isInitialLoad: true,
          },
        },
        end: 'end::pageReady',
        start: 'start::pageChange',
      });
      expect(performance.clearMarks).toHaveBeenCalledWith(perfomanceMarkers.startPageChange);
      expect(performance.clearMarks).toHaveBeenCalledWith(perfomanceMarkers.endPageReady);
    });
  });

  describe('Refresh', () => {
    beforeEach(() => {
      performance.getEntriesByName = jest
        .fn()
        .mockReturnValue([{ name: 'start::pageRefresh' }])
        .mockReturnValue([{ name: 'end::pageReady' }]);
    });
    it('should set isInitialLoad to false on refresh calls', () => {
      const pathname = '/test-path';
      const interaction = measureInteraction(pathname);

      jest.spyOn(global.Date, 'now').mockReturnValue(1733704200000); // 2024-12-09T00:30:00Z

      const eventData = {
        meta: { rangeFrom: '2024-12-08T01:00:00Z', rangeTo: '2024-12-09T01:00:00Z' },
      };

      interaction.pageReady(eventData);

      expect(performance.mark).toHaveBeenCalledWith(perfomanceMarkers.endPageReady);
      expect(performance.measure).toHaveBeenCalledWith(`[ttfmp:refresh] - ${pathname}`, {
        detail: {
          eventName: 'kibana:plugin_render_time',
          type: 'kibana:performance',
          customMetrics: undefined,
          meta: {
            queryRangeSecs: 86400,
            queryFromOffsetSecs: -84600,
            queryToOffsetSecs: 1800,
            isInitialLoad: false,
          },
        },
        end: 'end::pageReady',
        start: 'start::pageRefresh',
      });
    });
  });
});
