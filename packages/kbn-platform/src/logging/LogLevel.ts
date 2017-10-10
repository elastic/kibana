import { assertNever } from '../lib/utils';

/**
 * Possible log level string values.
 * @internal
 */
export type LogLevelId =
  | 'all'
  | 'fatal'
  | 'error'
  | 'warn'
  | 'info'
  | 'debug'
  | 'trace'
  | 'off';

/**
 * Represents the log level, manages string -> `LogLevel` conversion and comparison of log level
 * priorities between themselves.
 * @internal
 */
export class LogLevel {
  static readonly Off = new LogLevel('off', 1);
  static readonly Fatal = new LogLevel('fatal', 2);
  static readonly Error = new LogLevel('error', 3);
  static readonly Warn = new LogLevel('warn', 4);
  static readonly Info = new LogLevel('info', 5);
  static readonly Debug = new LogLevel('debug', 6);
  static readonly Trace = new LogLevel('trace', 7);
  static readonly All = new LogLevel('all', 8);

  private constructor(readonly id: LogLevelId, readonly value: number) {}

  /**
   * Indicates whether current log level covers the one that is passed as an argument.
   * @param level Instance of `LogLevel` to compare to.
   * @returns True if specified `level` is covered by this log level.
   */
  supports(level: LogLevel) {
    return this.value >= level.value;
  }

  /**
   * Converts string representation of log level into `LogLevel` instance.
   * @param level String representation of log level.
   * @returns Instance of `LogLevel` class.
   */
  static fromId(level: LogLevelId): LogLevel {
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
}
