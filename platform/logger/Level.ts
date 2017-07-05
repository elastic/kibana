import { assertNever } from '../lib/utils';

export type LogLevelId =
  | 'fatal'
  | 'error'
  | 'warn'
  | 'info'
  | 'debug'
  | 'trace';

export class Level {
  static Fatal = new Level('fatal', 1, 'red');
  static Error = new Level('error', 2, 'red');
  static Warn = new Level('warn', 3, 'yellow');
  static Info = new Level('info', 4);
  static Debug = new Level('debug', 5, 'green');
  static Trace = new Level('trace', 6, 'blue');

  constructor(
    readonly id: LogLevelId,
    readonly value: number,
    readonly color?: string
  ) {}

  supports(level: Level) {
    return this.value >= level.value;
  }

  static fromId(level: LogLevelId) {
    switch (level) {
      case 'fatal':
        return Level.Fatal;
      case 'error':
        return Level.Error;
      case 'warn':
        return Level.Warn;
      case 'info':
        return Level.Info;
      case 'debug':
        return Level.Debug;
      case 'trace':
        return Level.Trace;
      default:
        return assertNever(level);
    }
  }
}
