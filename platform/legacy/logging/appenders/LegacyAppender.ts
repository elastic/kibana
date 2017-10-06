import { Schema, typeOfSchema } from '../../../types/schema';
import { LogRecord } from '../../../logging/LogRecord';
import { DisposableAppender } from '../../../logging/appenders/Appenders';
import { LegacyKbnServer } from '../../LegacyKbnServer';

const createSchema = (schema: Schema) => {
  const { literal, object } = schema;

  return object({ kind: literal('legacy-appender') });
};

const schemaType = typeOfSchema(createSchema);
/** @internal */
export type LegacyAppenderConfigType = typeof schemaType;

/**
 * Simple appender that just forwards `LogRecord` to the legacy KbnServer log.
 * @internal
 */
export class LegacyAppender implements DisposableAppender {
  static createConfigSchema = createSchema;

  constructor(private readonly kbnServer: LegacyKbnServer) {}

  /**
   * Forwards `LogRecord` to the legacy platform that will layout and
   * write record to the configured destination.
   * @param record `LogRecord` instance to forward to.
   */
  append(record: LogRecord) {
    this.kbnServer.server.log(
      [record.level.id.toLowerCase(), ...record.context.split('.')],
      record.error || record.message,
      record.timestamp
    );
  }

  async dispose() {}
}
