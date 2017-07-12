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

  close() {
    super.close();

    this.outputStream!.end();
    this.outputStream = null;
  }
}
