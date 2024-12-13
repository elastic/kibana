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

  beforeEach(() => {
    jest.clearAllMocks();
    performance.mark = jest.fn();
    performance.measure = jest.fn();
  });

  it('should mark the start of the page change', () => {
    measureInteraction();
    expect(performance.mark).toHaveBeenCalledWith(perfomanceMarkers.startPageChange);
  });

  it('should mark the end of the page ready state and measure performance', () => {
    const interaction = measureInteraction();
    const pathname = '/test-path';
    interaction.pageReady(pathname);

    expect(performance.mark).toHaveBeenCalledWith(perfomanceMarkers.endPageReady);
    expect(performance.measure).toHaveBeenCalledWith(pathname, {
      detail: {
        eventName: 'kibana:plugin_render_time',
        type: 'kibana:performance',
      },
      start: perfomanceMarkers.startPageChange,
      end: perfomanceMarkers.endPageReady,
    });
  });

  it('should include custom metrics and meta in the performance measure', () => {
    const interaction = measureInteraction();
    const pathname = '/test-path';
    const eventData = {
      customMetrics: { key1: 'foo-metric', value1: 100 },
      meta: { rangeFrom: 'now-15m', rangeTo: 'now' },
    };

    interaction.pageReady(pathname, eventData);

    expect(performance.mark).toHaveBeenCalledWith(perfomanceMarkers.endPageReady);
    expect(performance.measure).toHaveBeenCalledWith(pathname, {
      detail: {
        eventName: 'kibana:plugin_render_time',
        type: 'kibana:performance',
        customMetrics: eventData.customMetrics,
        meta: {
          queryRangeSecs: 900,
          queryOffsetSecs: 0,
        },
      },
      end: 'end::pageReady',
      start: 'start::pageChange',
    });
  });

  it('should handle absolute date format correctly', () => {
    const interaction = measureInteraction();
    const pathname = '/test-path';
    jest.spyOn(global.Date, 'now').mockReturnValue(1733704200000); // 2024-12-09T00:30:00Z

    const eventData = {
      meta: { rangeFrom: '2024-12-09T00:00:00Z', rangeTo: '2024-12-09T00:30:00Z' },
    };

    interaction.pageReady(pathname, eventData);

    expect(performance.mark).toHaveBeenCalledWith(perfomanceMarkers.endPageReady);
    expect(performance.measure).toHaveBeenCalledWith(pathname, {
      detail: {
        eventName: 'kibana:plugin_render_time',
        type: 'kibana:performance',
        customMetrics: undefined,
        meta: {
          queryRangeSecs: 1800,
          queryOffsetSecs: 0,
        },
      },
      end: 'end::pageReady',
      start: 'start::pageChange',
    });
  });

  it('should handle negative offset when rangeTo is in the past', () => {
    const interaction = measureInteraction();
    const pathname = '/test-path';
    jest.spyOn(global.Date, 'now').mockReturnValue(1733704200000); // 2024-12-09T00:30:00Z

    const eventData = {
      meta: { rangeFrom: '2024-12-08T00:00:00Z', rangeTo: '2024-12-09T00:00:00Z' },
    };

    interaction.pageReady(pathname, eventData);

    expect(performance.mark).toHaveBeenCalledWith(perfomanceMarkers.endPageReady);
    expect(performance.measure).toHaveBeenCalledWith(pathname, {
      detail: {
        eventName: 'kibana:plugin_render_time',
        type: 'kibana:performance',
        customMetrics: undefined,
        meta: {
          queryRangeSecs: 86400,
          queryOffsetSecs: -1800,
        },
      },
      end: 'end::pageReady',
      start: 'start::pageChange',
    });
  });

  it('should handle positive offset when rangeTo is in the future', () => {
    const interaction = measureInteraction();
    const pathname = '/test-path';
    jest.spyOn(global.Date, 'now').mockReturnValue(1733704200000); // 2024-12-09T00:30:00Z

    const eventData = {
      meta: { rangeFrom: '2024-12-08T01:00:00Z', rangeTo: '2024-12-09T01:00:00Z' },
    };

    interaction.pageReady(pathname, eventData);

    expect(performance.mark).toHaveBeenCalledWith(perfomanceMarkers.endPageReady);
    expect(performance.measure).toHaveBeenCalledWith(pathname, {
      detail: {
        eventName: 'kibana:plugin_render_time',
        type: 'kibana:performance',
        customMetrics: undefined,
        meta: {
          queryRangeSecs: 86400,
          queryOffsetSecs: 1800,
        },
      },
      end: 'end::pageReady',
      start: 'start::pageChange',
    });
  });

  it('should not measure the same route twice', () => {
    const interaction = measureInteraction();
    const pathname = '/test-path';

    interaction.pageReady(pathname);
    interaction.pageReady(pathname);

    expect(performance.measure).toHaveBeenCalledTimes(1);
  });
});
