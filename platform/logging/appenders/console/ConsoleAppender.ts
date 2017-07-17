import { LogLevel } from "../../LogLevel";
import { LogRecord } from '../../LogRecord';
import { BaseAppender } from '../base/BaseAppender';
import { ConsoleAppenderConfig } from './ConsoleAppenderConfig';

class Color {
  static readonly Red = 31;
  static readonly Green = 32;
  static readonly Yellow = 33;
  static readonly Blue = 34;
  static readonly Magenta = 35;
}

const LEVEL_COLORS = new Map([
  [LogLevel.Fatal, Color.Red],
  [LogLevel.Error, Color.Red],
  [LogLevel.Warn, Color.Yellow],
  [LogLevel.Debug, Color.Green],
  [LogLevel.Trace, Color.Blue]
]);

export class ConsoleAppender extends BaseAppender {
  constructor(protected readonly config: ConsoleAppenderConfig) {
    super(config)
  }

  append(record: LogRecord) {
    super.append(record);
    console.log(this.logRecordToFormattedString(record));
  }

  protected formatLevel(level: LogLevel) {
    const levelString = super.formatLevel(level);
    if (!LEVEL_COLORS.has(level)) {
      return levelString;
    }

    return `\x1b[${LEVEL_COLORS.get(level)}m${levelString}\x1b[0m`;
  }

  protected formatContext(context: string) {
    return `\x1b[${Color.Magenta}m${super.formatContext(context)}\x1b[0m`;
  }
}
