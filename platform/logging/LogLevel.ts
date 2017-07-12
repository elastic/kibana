import { assertNever } from '../lib/utils';

export type LogLevelId =
  | 'all'
  | 'fatal'
  | 'error'
  | 'warn'
  | 'info'
  | 'debug'
  | 'trace'
  | 'off';

export class LogLevel {
  static Off = new LogLevel('off', 1);
  static Fatal = new LogLevel('fatal', 2);
  static Error = new LogLevel('error', 3);
  static Warn = new LogLevel('warn', 4);
  static Info = new LogLevel('info', 5);
  static Debug = new LogLevel('debug', 6);
  static Trace = new LogLevel('trace', 7);
  static All = new LogLevel('all', 8);

  constructor(readonly id: LogLevelId, readonly value: number) {}

  supports(level: LogLevel) {
    return this.value >= level.value;
  }

  static fromId(level: LogLevelId) {
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
