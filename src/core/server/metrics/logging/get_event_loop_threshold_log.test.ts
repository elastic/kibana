/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpsMetrics } from '..';
import { getEventLoopThresholdLog } from './get_event_loop_threshold_log';

function createMockOpsMetrics(eventLoopDelay: number | undefined) {
  return {
    process: {
      event_loop_delay: eventLoopDelay,
    },
  } as Pick<OpsMetrics, 'process'>;
}

describe('getEventLoopThresholdLog', () => {
  it('returns empty message on undefined `process.event_loop_delay`', () => {
    const thresholdMs = 200;
    const mockDelay = undefined;
    const result = getEventLoopThresholdLog(createMockOpsMetrics(mockDelay), thresholdMs);
    expect(result.message).toBe('');
  });

  it('returns empty message when `process.event_loop_delay` is less than threshold', () => {
    const thresholdMs = 200;
    const mockDelay = 190;
    const result = getEventLoopThresholdLog(createMockOpsMetrics(mockDelay), thresholdMs);
    expect(result.message).toBe('');
  });

  it('returns message when `process.event_loop_delay` exceeds the threshold', () => {
    const thresholdMs = 200;
    const mockDelay = 500;
    const result = getEventLoopThresholdLog(createMockOpsMetrics(mockDelay), thresholdMs);
    expect(result.message).toMatchInlineSnapshot(
      `"Event loop delay threshold exceeded 200ms. Recieved 500.000"`
    );
  });
});
