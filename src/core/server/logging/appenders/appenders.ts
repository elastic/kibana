/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { assertNever } from '@kbn/std';
import { DisposableAppender } from '@kbn/logging';

import { Layouts } from '../layouts/layouts';
import { ConsoleAppender, ConsoleAppenderConfig } from './console/console_appender';
import { FileAppender, FileAppenderConfig } from './file/file_appender';
import { RewriteAppender, RewriteAppenderConfig } from './rewrite/rewrite_appender';
import {
  RollingFileAppender,
  RollingFileAppenderConfig,
} from './rolling_file/rolling_file_appender';

/**
 * Config schema for validting the shape of the `appenders` key in in {@link LoggerContextConfigType} or
 * {@link LoggingConfigType}.
 *
 * @public
 */
export const appendersSchema = schema.oneOf([
  ConsoleAppender.configSchema,
  FileAppender.configSchema,
  RewriteAppender.configSchema,
  RollingFileAppender.configSchema,
]);

/** @public */
export type AppenderConfigType =
  | ConsoleAppenderConfig
  | FileAppenderConfig
  | RewriteAppenderConfig
  | RollingFileAppenderConfig;

/** @internal */
export class Appenders {
  public static configSchema = appendersSchema;

  /**
   * Factory method that creates specific `Appender` instances based on the passed `config` parameter.
   * @param config Configuration specific to a particular `Appender` implementation.
   * @returns Fully constructed `Appender` instance.
   */
  public static create(config: AppenderConfigType): DisposableAppender {
    switch (config.type) {
      case 'console':
        return new ConsoleAppender(Layouts.create(config.layout));
      case 'file':
        return new FileAppender(Layouts.create(config.layout), config.fileName);
      case 'rewrite':
        return new RewriteAppender(config);
      case 'rolling-file':
        return new RollingFileAppender(config);

      default:
        return assertNever(config);
    }
  }
}
