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

import { assertNever } from '../../utils';

/**
 * Possible log level string values.
 * @internal
 */
export type LogLevelId = 'all' | 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'off';

/**
 * Represents the log level, manages string to `LogLevel` conversion and comparison of log level
 * priorities between themselves.
 * @internal
 */
export class LogLevel {
  public static readonly Off = new LogLevel('off', 1);
  public static readonly Fatal = new LogLevel('fatal', 2);
  public static readonly Error = new LogLevel('error', 3);
  public static readonly Warn = new LogLevel('warn', 4);
  public static readonly Info = new LogLevel('info', 5);
  public static readonly Debug = new LogLevel('debug', 6);
  public static readonly Trace = new LogLevel('trace', 7);
  public static readonly All = new LogLevel('all', 8);

  /**
   * Converts string representation of log level into `LogLevel` instance.
   * @param level - String representation of log level.
   * @returns Instance of `LogLevel` class.
   */
  public static fromId(level: LogLevelId): LogLevel {
    switch (level) {
      case 'all':
        return LogLevel.All;
      case 'fatal':
        return LogLevel.Fatal;
      case 'error':
        return LogLevel.Error;
      case 'warn':
        return LogLevel.Warn;
      case 'info':
        return LogLevel.Info;
      case 'debug':
        return LogLevel.Debug;
      case 'trace':
        return LogLevel.Trace;
      case 'off':
        return LogLevel.Off;
      default:
        return assertNever(level);
    }
  }

  private constructor(readonly id: LogLevelId, readonly value: number) {}

  /**
   * Indicates whether current log level covers the one that is passed as an argument.
   * @param level - Instance of `LogLevel` to compare to.
   * @returns True if specified `level` is covered by this log level.
   */
  public supports(level: LogLevel) {
    return this.value >= level.value;
  }
}
