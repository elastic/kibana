import { Schema, typeOfSchema } from '../../../types';
import { LogRecord } from '../../LogRecord';
import { Layout, Layouts } from '../../layouts/Layouts';
import { DisposableAppender } from '../Appenders';

export const createSchema = (schema: Schema) => {
  const { literal, object } = schema;

  return object({
    kind: literal('console'),
    layout: Layouts.createConfigSchema(schema)
  });
};

const schemaType = typeOfSchema(createSchema);
export type ConsoleAppenderConfigType = typeof schemaType;

/**
 * Appender that formats all the `LogRecord` instances it receives and logs them via built-in `console`.
 */
export class ConsoleAppender implements DisposableAppender {
  /**
   * @internal
   */
  static createConfigSchema = createSchema;

  /**
   * Creates ConsoleAppender instance.
   * @param layout Instance of `Layout` sub-class responsible for `LogRecord` formatting.
   */
  constructor(private readonly layout: Layout) {}

  /**
   * Formats specified `record` and logs it via built-in `console`.
   * @param record `LogRecord` instance to be logged.
   */
  append(record: LogRecord) {
    console.log(this.layout.format(record));
  }

  /**
   * Disposes `ConsoleAppender`.
   */
  dispose() {}
}
