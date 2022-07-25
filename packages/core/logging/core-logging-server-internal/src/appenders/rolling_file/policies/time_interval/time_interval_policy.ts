/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { LogRecord } from '@kbn/logging';
import type { TimeIntervalTriggeringPolicyConfig } from '@kbn/core-logging-server';
import { RollingFileContext } from '../../rolling_file_context';
import { TriggeringPolicy } from '../policy';
import { getNextRollingTime } from './get_next_rolling_time';
import { isValidRolloverInterval } from './utils';

export const timeIntervalTriggeringPolicyConfigSchema = schema.object({
  type: schema.literal('time-interval'),
  interval: schema.duration({
    defaultValue: '24h',
    validate: (interval) => {
      if (!isValidRolloverInterval(interval)) {
        return 'Interval value cannot overflow to a higher time unit.';
      }
    },
  }),
  modulate: schema.boolean({ defaultValue: true }),
});

/**
 * A triggering policy based on a fixed time interval
 */
export class TimeIntervalTriggeringPolicy implements TriggeringPolicy {
  /**
   * milliseconds timestamp of when the next rollover should occur.
   */
  private nextRolloverTime: number;

  constructor(
    private readonly config: TimeIntervalTriggeringPolicyConfig,
    context: RollingFileContext
  ) {
    this.nextRolloverTime = getNextRollingTime(
      context.currentFileTime || Date.now(),
      config.interval,
      config.modulate
    );
  }

  isTriggeringEvent(record: LogRecord): boolean {
    const eventTime = record.timestamp.getTime();
    if (eventTime >= this.nextRolloverTime) {
      this.nextRolloverTime = getNextRollingTime(
        eventTime,
        this.config.interval,
        this.config.modulate
      );
      return true;
    }
    return false;
  }
}
