import { schema } from '../../../config/schema';

import { Layout, Layouts } from '../../layouts/layouts';
import { LogRecord } from '../../log_record';
import { DisposableAppender } from '../appenders';

const { literal, object } = schema;

/**
 * Appender that formats all the `LogRecord` instances it receives and logs them via built-in `console`.
 * @internal
 */
export class ConsoleAppender implements DisposableAppender {
  public static configSchema = object({
    kind: literal('console'),
    layout: Layouts.configSchema,
  });

  /**
   * Creates ConsoleAppender instance.
   * @param layout Instance of `Layout` sub-class responsible for `LogRecord` formatting.
   */
  constructor(private readonly layout: Layout) {}

  /**
   * Formats specified `record` and logs it via built-in `console`.
   * @param record `LogRecord` instance to be logged.
   */
  public append(record: LogRecord) {
    // tslint:disable no-console
    console.log(this.layout.format(record));
  }

  /**
   * Disposes `ConsoleAppender`.
   */
  public dispose() {
    // noop
  }
}
