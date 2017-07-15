import { LogRecord } from '../../LogRecord';
import { BaseAppender } from '../base/BaseAppender';

export class BufferAppender extends BaseAppender {
  readonly buffer: LogRecord[] = [];

  append(record: LogRecord) {
    super.append(record);

    this.buffer.push(record);
  }

  async close() {
    // Workaround for a Babel `await super.***();` bug (https://github.com/babel/babel/issues/3930), we should
    // get rid of it once we migrate to Babel 7 (fixed in https://github.com/babel/babel/pull/5677).
    await BaseAppender.prototype.close();

    this.buffer.length = 0;
  }
}
