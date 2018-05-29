import { createWriteStream, WriteStream } from 'fs';
import { schema } from '../../../config/schema';

import { Layout, Layouts } from '../../layouts/layouts';
import { LogRecord } from '../../log_record';
import { DisposableAppender } from '../appenders';

const { literal, object, string } = schema;

/**
 * Appender that formats all the `LogRecord` instances it receives and writes them to the specified file.
 * @internal
 */
export class FileAppender implements DisposableAppender {
  public static configSchema = object({
    kind: literal('file'),
    layout: Layouts.configSchema,
    path: string(),
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
  public append(record: LogRecord) {
    if (this.outputStream === undefined) {
      this.outputStream = createWriteStream(this.path, {
        encoding: 'utf8',
        flags: 'a',
      });
    }

    this.outputStream.write(`${this.layout.format(record)}\n`);
  }

  /**
   * Disposes `FileAppender`. Waits for the underlying file stream to be completely flushed and closed.
   */
  public async dispose() {
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
