import { LogRecord } from '../../LogRecord';
import { BaseAppender } from '../base/BaseAppender';
import { ConsoleAppenderConfig } from './ConsoleAppenderConfig';

export class ConsoleAppender extends BaseAppender {
  constructor(protected readonly config: ConsoleAppenderConfig) {
    super(config)
  }

  append(record: LogRecord) {
    super.append(record);

    console.log(
      this.config.pattern
        .replace('{timestamp}', record.timestamp.toISOString())
        .replace('{level}', record.level.id.toUpperCase())
        .replace('{context}', record.context)
        .replace('{message}', record.message)
    );
  }
}
