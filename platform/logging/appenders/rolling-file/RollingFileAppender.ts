import { LogRecord } from '../../LogRecord';
import { BaseAppender } from '../base/BaseAppender';
import { RollingFileAppenderConfig } from './RollingFileAppenderConfig';

export class RollingFileAppender extends BaseAppender {
  constructor(protected readonly config: RollingFileAppenderConfig) {
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
