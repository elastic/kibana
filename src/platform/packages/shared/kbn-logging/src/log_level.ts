/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertNever } from '@kbn/std';

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

  private constructor(public readonly id: LogLevelId, public readonly value: number) {}

  /**
   * Indicates whether current log level covers the one that is passed as an argument.
   * @param level - Instance of `LogLevel` to compare to.
   * @returns True if specified `level` is covered by this log level.
   */
  public supports(level: LogLevel) {
    return this.value >= level.value;
  }
}
