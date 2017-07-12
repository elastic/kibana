import { LogRecord } from '../../LogRecord';
import { BaseAppender } from '../base/BaseAppender';

export class BufferAppender extends BaseAppender {
  readonly buffer: LogRecord[] = [];

  append(record: LogRecord) {
    super.append(record);

    this.buffer.push(record);
  }

  close() {
    super.close();

    this.buffer.length = 0;
  }
}
