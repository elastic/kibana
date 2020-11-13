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
import { assertNever } from '@kbn/std';
import { DisposableAppender } from '@kbn/logging';

import {
  LegacyAppender,
  LegacyAppenderConfig,
} from '../../legacy/logging/appenders/legacy_appender';
import { Layouts } from '../layouts/layouts';
import { ConsoleAppender, ConsoleAppenderConfig } from './console/console_appender';
import { FileAppender, FileAppenderConfig } from './file/file_appender';

/**
 * Config schema for validting the shape of the `appenders` key in in {@link LoggerContextConfigType} or
 * {@link LoggingConfigType}.
 *
 * @public
 */
export const appendersSchema = schema.oneOf([
  ConsoleAppender.configSchema,
  FileAppender.configSchema,
  LegacyAppender.configSchema,
]);

/** @public */
export type AppenderConfigType = ConsoleAppenderConfig | FileAppenderConfig | LegacyAppenderConfig;

/** @internal */
export class Appenders {
  public static configSchema = appendersSchema;

  /**
   * Factory method that creates specific `Appender` instances based on the passed `config` parameter.
   * @param config Configuration specific to a particular `Appender` implementation.
   * @returns Fully constructed `Appender` instance.
   */
  public static create(config: AppenderConfigType): DisposableAppender {
    switch (config.kind) {
      case 'console':
        return new ConsoleAppender(Layouts.create(config.layout));

      case 'file':
        return new FileAppender(Layouts.create(config.layout), config.path);

      case 'legacy-appender':
        return new LegacyAppender(config.legacyLoggingConfig);

      default:
        return assertNever(config);
    }
  }
}
