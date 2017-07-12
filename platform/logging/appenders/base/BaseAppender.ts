import { LogRecord } from '../../LogRecord';
import { BaseAppenderConfig } from './BaseAppenderConfig';

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

  close() {
    this.isClosed = true;
  }
}
