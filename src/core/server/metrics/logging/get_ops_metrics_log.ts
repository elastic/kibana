/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import numeral from '@elastic/numeral';
import { LogMeta } from '@kbn/logging';
import { OpsMetrics } from '..';

/**
 * Converts ops metrics into ECS-compliant `LogMeta` for logging
 *
 * @internal
 */
export function getEcsOpsMetricsLog(metrics: OpsMetrics) {
  const { process, os } = metrics;
  const processMemoryUsedInBytes = process?.memory?.heap?.used_in_bytes;
  const processMemoryUsedInBytesMsg = processMemoryUsedInBytes
    ? `memory: ${numeral(processMemoryUsedInBytes).format('0.0b')} `
    : '';

  // ECS process.uptime is in seconds:
  const uptimeVal = process?.uptime_in_millis
    ? Math.floor(process.uptime_in_millis / 1000)
    : undefined;

  // HH:mm:ss message format for backward compatibility
  const uptimeValMsg = uptimeVal ? `uptime: ${numeral(uptimeVal).format('00:00:00')} ` : '';

  // Event loop delay metrics are in ms
  const eventLoopDelayVal = process?.event_loop_delay;
  const eventLoopDelayValMsg = eventLoopDelayVal
    ? `mean delay: ${numeral(process?.event_loop_delay).format('0.000')}`
    : '';

  const eventLoopDelayPercentiles = process?.event_loop_delay_histogram?.percentiles;

  // Extract 50th, 95th and 99th percentiles for log meta
  const eventLoopDelayHistVals = eventLoopDelayPercentiles
    ? {
        50: eventLoopDelayPercentiles[50],
        95: eventLoopDelayPercentiles[95],
        99: eventLoopDelayPercentiles[99],
      }
    : undefined;
  // Format message from 50th, 95th and 99th percentiles
  const eventLoopDelayHistMsg = eventLoopDelayPercentiles
    ? ` delay histogram: { 50: ${numeral(eventLoopDelayPercentiles['50']).format(
        '0.000'
      )}; 95: ${numeral(eventLoopDelayPercentiles['95']).format('0.000')}; 99: ${numeral(
        eventLoopDelayPercentiles['99']
      ).format('0.000')} }`
    : '';

  const loadEntries = {
    '1m': os?.load ? os?.load['1m'] : undefined,
    '5m': os?.load ? os?.load['5m'] : undefined,
    '15m': os?.load ? os?.load['15m'] : undefined,
  };

  const loadVals = [...Object.values(os?.load ?? [])];
  const loadValsMsg =
    loadVals.length > 0
      ? `load: [${loadVals.map((val: number) => {
          return numeral(val).format('0.00');
        })}] `
      : '';

  const meta: LogMeta = {
    event: {
      kind: 'metric',
      category: ['process', 'host'],
      type: ['info'],
    },
    process: {
      uptime: uptimeVal,
      // @ts-expect-error custom fields not yet part of ECS
      memory: {
        heap: {
          usedInBytes: processMemoryUsedInBytes,
        },
      },
      eventLoopDelay: eventLoopDelayVal,
      eventLoopDelayHistogram: eventLoopDelayHistVals,
    },
    host: {
      os: {
        // @ts-expect-error custom fields not yet part of ECS
        load: loadEntries,
      },
    },
  };

  return {
    message: [
      processMemoryUsedInBytesMsg,
      uptimeValMsg,
      loadValsMsg,
      eventLoopDelayValMsg,
      eventLoopDelayHistMsg,
    ].join(''),
    meta,
  };
}
