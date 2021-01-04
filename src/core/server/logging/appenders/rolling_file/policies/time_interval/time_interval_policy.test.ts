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

import { getNextRollingTimeMock } from './time_interval_policy.test.mocks';
import moment from 'moment-timezone';
import { LogLevel, LogRecord } from '@kbn/logging';
import { schema } from '@kbn/config-schema';
import {
  TimeIntervalTriggeringPolicy,
  TimeIntervalTriggeringPolicyConfig,
} from './time_interval_policy';
import { RollingFileContext } from '../../rolling_file_context';

const format = 'YYYY-MM-DD HH:mm:ss';

describe('TimeIntervalTriggeringPolicy', () => {
  afterEach(() => {
    getNextRollingTimeMock.mockReset();
    jest.restoreAllMocks();
  });

  const createLogRecord = (timestamp: Date): LogRecord => ({
    timestamp,
    level: LogLevel.Info,
    context: 'context',
    message: 'just a log',
    pid: 42,
  });

  const createContext = (currentFileTime: number = Date.now()): RollingFileContext => {
    const context = new RollingFileContext('foo.log');
    context.currentFileTime = currentFileTime;
    return context;
  };

  const createConfig = (
    interval: string = '15m',
    modulate: boolean = false
  ): TimeIntervalTriggeringPolicyConfig => ({
    kind: 'time-interval',
    interval: schema.duration().validate(interval),
    modulate,
  });

  it('calls `getNextRollingTime` during construction with the correct parameters', () => {
    const date = moment('2010-10-20 04:27:12', format).toDate();
    const context = createContext(date.getTime());
    const config = createConfig('15m', true);

    new TimeIntervalTriggeringPolicy(config, context);

    expect(getNextRollingTimeMock).toHaveBeenCalledTimes(1);
    expect(getNextRollingTimeMock).toHaveBeenCalledWith(
      context.currentFileTime,
      config.interval,
      config.modulate
    );
  });

  it('calls `getNextRollingTime` with the current time if `context.currentFileTime` is not set', () => {
    const currentTime = moment('2018-06-15 04:27:12', format).toDate().getTime();
    jest.spyOn(Date, 'now').mockReturnValue(currentTime);
    const context = createContext(0);
    const config = createConfig('15m', true);

    new TimeIntervalTriggeringPolicy(config, context);

    expect(getNextRollingTimeMock).toHaveBeenCalledTimes(1);
    expect(getNextRollingTimeMock).toHaveBeenCalledWith(
      currentTime,
      config.interval,
      config.modulate
    );
  });

  describe('#isTriggeringEvent', () => {
    it('returns true if the event time is after the nextRolloverTime', () => {
      const eventDate = moment('2010-10-20 04:43:12', format).toDate();
      const nextRolloverDate = moment('2010-10-20 04:00:00', format).toDate();

      getNextRollingTimeMock.mockReturnValue(nextRolloverDate.getTime());

      const policy = new TimeIntervalTriggeringPolicy(createConfig(), createContext());

      expect(policy.isTriggeringEvent(createLogRecord(eventDate))).toBeTruthy();
    });

    it('returns true if the event time is exactly the nextRolloverTime', () => {
      const eventDate = moment('2010-10-20 04:00:00', format).toDate();
      const nextRolloverDate = moment('2010-10-20 04:00:00', format).toDate();

      getNextRollingTimeMock.mockReturnValue(nextRolloverDate.getTime());

      const policy = new TimeIntervalTriggeringPolicy(createConfig(), createContext());

      expect(policy.isTriggeringEvent(createLogRecord(eventDate))).toBeTruthy();
    });

    it('returns false if the event time is before the nextRolloverTime', () => {
      const eventDate = moment('2010-10-20 03:47:12', format).toDate();
      const nextRolloverDate = moment('2010-10-20 04:00:00', format).toDate();

      getNextRollingTimeMock.mockReturnValue(nextRolloverDate.getTime());

      const policy = new TimeIntervalTriggeringPolicy(createConfig(), createContext());

      expect(policy.isTriggeringEvent(createLogRecord(eventDate))).toBeFalsy();
    });

    it('refreshes its `nextRolloverTime` when returning true', () => {
      const eventDate = moment('2010-10-20 04:43:12', format).toDate();
      const firstRollOverDate = moment('2010-10-20 04:00:00', format).toDate();
      const nextRollOverDate = moment('2010-10-20 08:00:00', format).toDate();

      getNextRollingTimeMock
        // constructor call
        .mockReturnValueOnce(firstRollOverDate.getTime())
        // call performed during `isTriggeringEvent` to refresh the rolling time
        .mockReturnValueOnce(nextRollOverDate.getTime());

      const policy = new TimeIntervalTriggeringPolicy(createConfig(), createContext());

      const logRecord = createLogRecord(eventDate);

      // rollingDate is firstRollOverDate
      expect(policy.isTriggeringEvent(logRecord)).toBeTruthy();
      // rollingDate should be nextRollOverDate
      expect(policy.isTriggeringEvent(logRecord)).toBeFalsy();
    });
  });
});
