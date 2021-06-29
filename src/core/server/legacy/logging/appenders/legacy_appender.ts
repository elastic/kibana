/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { LegacyLoggingServer } from '@kbn/legacy-logging';
import { DisposableAppender, LogRecord } from '@kbn/logging';

export interface LegacyAppenderConfig {
  type: 'legacy-appender';
  legacyLoggingConfig?: Record<string, any>;
}

/**
 * Simple appender that just forwards `LogRecord` to the legacy KbnServer log.
 * @internal
 */
export class LegacyAppender implements DisposableAppender {
  public static configSchema = schema.object({
    type: schema.literal('legacy-appender'),
    legacyLoggingConfig: schema.recordOf(schema.string(), schema.any()),
  });

  /**
   * Sets {@link Appender.receiveAllLevels} because legacy does its own filtering based on the legacy logging
   * configuration.
   */
  public readonly receiveAllLevels = true;

  private readonly loggingServer: LegacyLoggingServer;

  constructor(legacyLoggingConfig: any) {
    this.loggingServer = new LegacyLoggingServer(legacyLoggingConfig);
  }

  /**
   * Forwards `LogRecord` to the legacy platform that will layout and
   * write record to the configured destination.
   * @param record `LogRecord` instance to forward to.
   */
  public append(record: LogRecord) {
    this.loggingServer.log(record);
  }

  public dispose() {
    this.loggingServer.stop();
  }
}
