/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceStart } from '@kbn/core/server';
import type { PerformanceMetricEvent } from '@kbn/ebt-tools';
import { ESQLEditorTelemetryService } from './telemetry_service';

const mockMetricEvent = jest.fn();

jest.mock('@kbn/ebt-tools', () => ({
  ...jest.requireActual('@kbn/ebt-tools'),
  reportPerformanceMetricEvent: (_: AnalyticsServiceStart, args: PerformanceMetricEvent) => {
    mockMetricEvent(args);
  },
}));

describe('ESQLEditorTelemetryService performance metrics', () => {
  beforeEach(() => {
    mockMetricEvent.mockReset();
  });

  it('reports init latency payload', () => {
    const analytics = {
      reportEvent: jest.fn(),
    } as Pick<AnalyticsServiceStart, 'reportEvent'> as AnalyticsServiceStart;
    const service = new ESQLEditorTelemetryService(analytics);

    service.trackInitLatency(123, 'session-1');

    expect(mockMetricEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'esql_editor_init_latency',
        duration: 123,
        meta: {
          session_id: 'session-1',
        },
      })
    );
  });

  it('reports input latency payload', () => {
    const analytics = {
      reportEvent: jest.fn(),
    } as Pick<AnalyticsServiceStart, 'reportEvent'> as AnalyticsServiceStart;
    const service = new ESQLEditorTelemetryService(analytics);

    service.trackInputLatency({
      duration: 15,
      queryLength: 44,
      queryLines: 2,
      sessionId: 'session-1',
      isInitialLoad: true,
    });

    expect(mockMetricEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'esql_editor_input_latency',
        duration: 15,
        key1: 'query_length',
        value1: 44,
        key2: 'query_lines',
        value2: 2,
        meta: expect.objectContaining({
          session_id: 'session-1',
          is_initial_load: true,
        }),
      })
    );
  });

  it('reports suggestions latency payload', () => {
    const analytics = {
      reportEvent: jest.fn(),
    } as Pick<AnalyticsServiceStart, 'reportEvent'> as AnalyticsServiceStart;
    const service = new ESQLEditorTelemetryService(analytics);

    service.trackSuggestionsLatency({
      duration: 10,
      queryLength: 90,
      queryLines: 1,
      sessionId: 'session-1',
      isInitialLoad: false,
    });

    expect(mockMetricEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'esql_editor_suggestions_latency',
        duration: 10,
        key1: 'query_length',
        value1: 90,
        key2: 'query_lines',
        value2: 1,
        meta: expect.objectContaining({
          session_id: 'session-1',
          is_initial_load: false,
        }),
      })
    );
  });

  it('reports validation latency payload', () => {
    const analytics = {
      reportEvent: jest.fn(),
    } as Pick<AnalyticsServiceStart, 'reportEvent'> as AnalyticsServiceStart;
    const service = new ESQLEditorTelemetryService(analytics);

    service.trackValidationLatency({
      duration: 9,
      queryLength: 12,
      queryLines: 1,
      sessionId: 'session-1',
      isInitialLoad: false,
    });

    expect(mockMetricEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'esql_editor_validation_latency',
        duration: 9,
        key1: 'query_length',
        value1: 12,
        key2: 'query_lines',
        value2: 1,
        meta: expect.objectContaining({
          session_id: 'session-1',
          is_initial_load: false,
        }),
      })
    );
  });
});
