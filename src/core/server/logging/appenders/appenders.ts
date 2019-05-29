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

import { schema, TypeOf } from '@kbn/config-schema';

import { assertNever } from '../../../utils';
import { LegacyAppender } from '../../legacy/logging/appenders/legacy_appender';
import { Layouts } from '../layouts/layouts';
import { LogRecord } from '../log_record';
import { ConsoleAppender } from './console/console_appender';
import { FileAppender } from './file/file_appender';

const appendersSchema = schema.oneOf([
  ConsoleAppender.configSchema,
  FileAppender.configSchema,
  LegacyAppender.configSchema,
]);

/** @internal */
export type AppenderConfigType = TypeOf<typeof appendersSchema>;

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
