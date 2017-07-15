import { LogRecord } from '../../LogRecord';
import { BaseAppender } from '../base/BaseAppender';
import { ConsoleAppenderConfig } from './ConsoleAppenderConfig';

export class ConsoleAppender extends BaseAppender {
  constructor(protected readonly config: ConsoleAppenderConfig) {
    super(config)
  }

  append(record: LogRecord) {
    super.append(record);
    console.log(this.logRecordToFormattedString(record));
  }
}
