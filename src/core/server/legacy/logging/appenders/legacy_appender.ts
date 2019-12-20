/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { schema } from '@kbn/config-schema';
import { DisposableAppender } from '../../../logging/appenders/appenders';
import { LogRecord } from '../../../logging/log_record';
import { LegacyLoggingServer } from '../legacy_logging_server';
import { Vars } from '../../types';

/**
 * Simple appender that just forwards `LogRecord` to the legacy KbnServer log.
 * @internal
 */
export class LegacyAppender implements DisposableAppender {
  public static configSchema = schema.object({
    kind: schema.literal('legacy-appender'),
    legacyLoggingConfig: schema.any(),
  });

  private readonly loggingServer: LegacyLoggingServer;

  constructor(legacyLoggingConfig: Readonly<Vars>) {
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
