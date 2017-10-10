import { Schema, typeOfSchema } from '../../../types/schema';
import { LogRecord } from '../../LogRecord';
import { Layout, Layouts } from '../../layouts/Layouts';
import { DisposableAppender } from '../Appenders';

const createSchema = (schema: Schema) => {
  const { literal, object } = schema;

  return object({
    kind: literal('console'),
    layout: Layouts.createConfigSchema(schema)
  });
};

const schemaType = typeOfSchema(createSchema);
/** @internal */
export type ConsoleAppenderConfigType = typeof schemaType;

/**
 * Appender that formats all the `LogRecord` instances it receives and logs them via built-in `console`.
 * @internal
 */
export class ConsoleAppender implements DisposableAppender {
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
