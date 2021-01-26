/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import numeral from '@elastic/numeral';
import { EcsOpsMetricsEvent, EcsEventKind, EcsEventCategory, EcsEventType } from '../../logging';
import { OpsMetrics } from '..';

const ECS_VERSION = '1.7.0';
/**
 * Converts ops metrics into ECS-compliant `LogMeta` for logging
 *
 * @internal
 */
export function getEcsOpsMetricsLog(metrics: OpsMetrics): EcsOpsMetricsEvent {
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

  // Event loop delay is in ms
  const eventLoopDelayVal = process?.event_loop_delay;
  const eventLoopDelayValMsg = eventLoopDelayVal
    ? `delay: ${numeral(process?.event_loop_delay).format('0.000')}`
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

  return {
    ecs: { version: ECS_VERSION },
    message: `${processMemoryUsedInBytesMsg}${uptimeValMsg}${loadValsMsg}${eventLoopDelayValMsg}`,
    event: {
      kind: EcsEventKind.METRIC,
      category: [EcsEventCategory.PROCESS, EcsEventCategory.HOST],
      type: EcsEventType.INFO,
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
    },
    host: {
      os: {
        load: loadEntries,
      },
    },
  };
}
