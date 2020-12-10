/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Duration } from 'moment-timezone';
import { schema } from '@kbn/config-schema';
import { LogRecord } from '@kbn/logging';
import { RollingFileContext } from '../../rolling_file_context';
import { TriggeringPolicy } from '../policy';
import { getNextRollingTime } from './get_next_rolling_time';
import { isValidRolloverInterval } from './utils';

export interface TimeIntervalTriggeringPolicyConfig {
  kind: 'time-interval';

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
  kind: schema.literal('time-interval'),
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
