import { createWriteStream, WriteStream } from 'fs';
import { schema } from '@kbn/utils';

import { Layout, Layouts } from '../../layouts/Layouts';
import { LogRecord } from '../../LogRecord';
import { DisposableAppender } from '../Appenders';

const { literal, object, string } = schema;

/**
 * Appender that formats all the `LogRecord` instances it receives and writes them to the specified file.
 * @internal
 */
export class FileAppender implements DisposableAppender {
  static configSchema = object({
    kind: literal('file'),
    path: string(),
    layout: Layouts.configSchema,
  });

  /**
   * Writable file stream to write formatted `LogRecord` to.
   */
  private outputStream?: WriteStream;

  /**
   * Creates FileAppender instance with specified layout and file path.
   * @param layout Instance of `Layout` sub-class responsible for `LogRecord` formatting.
   * @param path Path to the file where log records should be stored.
   */
  constructor(private readonly layout: Layout, private readonly path: string) {}

  /**
   * Formats specified `record` and writes them to the specified file.
   * @param record `LogRecord` instance to be logged.
   */
  append(record: LogRecord) {
    if (this.outputStream === undefined) {
      this.outputStream = createWriteStream(this.path, {
        flags: 'a',
        encoding: 'utf8',
      });
    }

    this.outputStream.write(`${this.layout.format(record)}\n`);
  }

  /**
   * Disposes `FileAppender`. Waits for the underlying file stream to be completely flushed and closed.
   */
  async dispose() {
    await new Promise(resolve => {
      if (this.outputStream === undefined) {
        return resolve();
      }

      this.outputStream.end(undefined, undefined, () => {
        this.outputStream = undefined;
        resolve();
      });
    });
  }
}
