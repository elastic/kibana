import { createWriteStream, WriteStream } from 'fs';
import { LogRecord } from '../../LogRecord';
import { BaseAppender } from '../base/BaseAppender';
import { FileAppenderConfig } from './FileAppenderConfig';

export class FileAppender extends BaseAppender {
  private outputStream: WriteStream | null;

  constructor(protected readonly config: FileAppenderConfig) {
    super(config);

    this.outputStream = createWriteStream(config.path, {
      flags: 'a',
      encoding: 'utf8'
    });
  }

  append(record: LogRecord) {
    super.append(record);

    this.outputStream!.write(
      `${this.config.pattern
        .replace('{timestamp}', record.timestamp.toISOString())
        .replace('{level}', record.level.id.toUpperCase())
        .replace('{context}', record.context)
        .replace('{message}', record.message)}\n`
    );
  }

  async close() {
    // Workaround for a Babel `await super.***();` bug (https://github.com/babel/babel/issues/3930), we should
    // get rid of it once we migrate to Babel 7 (fixed in https://github.com/babel/babel/pull/5677).
    await BaseAppender.prototype.close.call(this);

    await new Promise((resolve) => {
      this.outputStream!.end(undefined, undefined, () => {
        this.outputStream = null;
        resolve();
      });
    });
  }
}
