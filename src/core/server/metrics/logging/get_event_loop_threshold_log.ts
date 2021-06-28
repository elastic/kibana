/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import numeral from '@elastic/numeral';
import type { OpsMetrics } from '..';

/**
 * Generates a message to be logged when event_loop_delay exceeds defined threshold.
 *
 * @internal
 */
export function getEventLoopThresholdLog(
  metrics: Pick<OpsMetrics, 'process'>,
  thresholdMs: number
) {
  const { process } = metrics;
  // Event loop delay is in ms
  const eventLoopDelayVal = process?.event_loop_delay;
  let message = '';

  if (eventLoopDelayVal && eventLoopDelayVal > thresholdMs) {
    message = `Event loop delay threshold exceeded ${thresholdMs}ms. Recieved ${numeral(
      eventLoopDelayVal
    ).format('0.000')}`;
  }

  return {
    message,
  };
}
