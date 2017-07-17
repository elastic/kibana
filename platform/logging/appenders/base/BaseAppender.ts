import { LogLevel } from '../../LogLevel';
import { LogRecord } from '../../LogRecord';
import { BaseAppenderConfig } from './BaseAppenderConfig';

const PATTERN_REGEX = /{timestamp}|{level}|{context}|{message}/gi;

export interface Appender {
  append(record: LogRecord): void;
}

export abstract class BaseAppender implements Appender {
  private isClosed = false;

  constructor(protected readonly config: BaseAppenderConfig) {
  }

  append(record: LogRecord) {
    if (this.isClosed) {
      // TODO: What to do here?
      throw new Error('Appender has been closed and can not be used anymore!');
    }
  }

  async close() {
    this.isClosed = true;
  }

  protected logRecordToFormattedString(record: LogRecord) {
    const patternParameters = new Map([
      ['{timestamp}', record.timestamp.toISOString()],
      ['{level}', this.formatLevel(record.level)],
      ['{context}', this.formatContext(record.context)],
      ['{message}', record.message]
    ]);

    return this.config.pattern.replace(PATTERN_REGEX, (match) => patternParameters.get(match)!);
  }

  protected formatLevel(level: LogLevel) {
    return level.id.toUpperCase().padEnd(5);
  }

  protected formatContext(context: string) {
    return context;
  }
}
