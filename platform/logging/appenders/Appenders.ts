import { assertNever } from '../../lib/utils';
import { Schema } from '../../types';
import {
  ConsoleAppender,
  ConsoleAppenderConfigType
} from './console/ConsoleAppender';
import { FileAppender, FileAppenderConfigType } from './file/FileAppender';
import { LogRecord } from '../LogRecord';
import { Layouts } from '../layouts/Layouts';

/** @internal */
export type AppenderConfigType =
  | ConsoleAppenderConfigType
  | FileAppenderConfigType;

/**
 * Entity that can append `LogRecord` instances to file, stdout, memory or whatever
 * is implemented internally. It's supposed to be used by `Logger`.
 * @internal
 */
export interface Appender {
  append(record: LogRecord): void;
}

/**
 * This interface should be additionally implemented by the `Appender`'s if they are supposed
 * to be properly disposed. It's intentionally separated from `Appender` interface so that `Logger`
 * that interacts with `Appender` doesn't have control over appender lifetime.
 * @internal
 */
export interface DisposableAppender extends Appender {
  dispose: () => void;
}

/** @internal */
export class Appenders {
  static createConfigSchema(schema: Schema) {
    const { oneOf } = schema;

    return oneOf([
      ConsoleAppender.createConfigSchema(schema),
      FileAppender.createConfigSchema(schema)
    ]);
  }

  /**
   * Factory method that creates specific `Appender` instances based on the passed `config` parameter.
   * @param config Configuration specific to a particular `Appender` implementation.
   * @returns Fully constructed `Appender` instance.
   */
  static create(config: AppenderConfigType): DisposableAppender {
    const layout = Layouts.create(config.layout);

    switch (config.kind) {
      case 'console':
        return new ConsoleAppender(layout);
      case 'file':
        return new FileAppender(layout, config.path);
      default:
        return assertNever(config);
    }
  }
}
