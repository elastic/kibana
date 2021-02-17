/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Duration } from 'moment-timezone';
import { schema } from '@kbn/config-schema';
import { LogRecord } from '@kbn/logging';
import { RollingFileContext } from '../../rolling_file_context';
import { TriggeringPolicy } from '../policy';
import { getNextRollingTime } from './get_next_rolling_time';
import { isValidRolloverInterval } from './utils';

export interface TimeIntervalTriggeringPolicyConfig {
  type: 'time-interval';

  /**
   * How often a rollover should occur.
   *
   * @remarks
   * Due to how modulate rolling works, it is required to have an integer value for the highest time unit
   * of the duration (you can't overflow to a higher unit).
   * For example, `15m` and `4h` are valid values , but `90m` is not (as it is `1.5h`).
   */
  interval: Duration;

  /**
   * Indicates whether the interval should be adjusted to cause the next rollover to occur on the interval boundary.
   *
   * For example, if the interval is `4h` and the current hour is 3 am then
   * the first rollover will occur at 4 am and then next ones will occur at 8 am, noon, 4pm, etc.
   * The default value is true.
   */
  modulate: boolean;
}

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
