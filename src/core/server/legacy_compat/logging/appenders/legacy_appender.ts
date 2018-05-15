import { schema } from '../../../config/schema';

import { LogRecord } from '../../../logging/log_record';
import { DisposableAppender } from '../../../logging/appenders/appenders';
import { LegacyKbnServer } from '../../legacy_kbn_server';

const { literal, object } = schema;

/**
 * Simple appender that just forwards `LogRecord` to the legacy KbnServer log.
 * @internal
 */
export class LegacyAppender implements DisposableAppender {
  static configSchema = object({
    kind: literal('legacy-appender'),
  });

  constructor(private readonly kbnServer: LegacyKbnServer) {}

  /**
   * Forwards `LogRecord` to the legacy platform that will layout and
   * write record to the configured destination.
   * @param record `LogRecord` instance to forward to.
   */
  append(record: LogRecord) {
    this.kbnServer.log(
      [record.level.id.toLowerCase(), ...record.context.split('.')],
      record.error || record.message,
      record.timestamp
    );
  }

  async dispose() {}
}
