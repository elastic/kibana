import { createWriteStream, WriteStream } from 'fs';
import { Schema, typeOfSchema } from '../../../types/schema';
import { Layout, Layouts } from '../../layouts/Layouts';
import { LogRecord } from '../../LogRecord';
import { DisposableAppender } from '../Appenders';

const createSchema = (schema: Schema) => {
  const { literal, object, string } = schema;
  return object({
    kind: literal('file'),
    path: string(),
    layout: Layouts.createConfigSchema(schema)
  });
};

const schemaType = typeOfSchema(createSchema);
/** @internal */
export type FileAppenderConfigType = typeof schemaType;

/**
 * Appender that formats all the `LogRecord` instances it receives and writes them to the specified file.
 * @internal
 */
export class FileAppender implements DisposableAppender {
  static createConfigSchema = createSchema;

  /**
   * Writable file stream to write formatted `LogRecord` to.
   */
  private outputStream: WriteStream | null = null;

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
    if (this.outputStream === null) {
      this.outputStream = createWriteStream(this.path, {
        flags: 'a',
        defaultEncoding: 'utf8'
      });
    }

    this.outputStream.write(`${this.layout.format(record)}\n`);
  }

  /**
   * Disposes `FileAppender`. Waits for the underlying file stream to be completely flushed and closed.
   */
  async dispose() {
    await new Promise(resolve => {
      if (this.outputStream === null) {
        return resolve();
      }

      this.outputStream.end(undefined, undefined, () => {
        this.outputStream = null;
        resolve();
      });
    });
  }
}
