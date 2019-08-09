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
import { AppenderConfigType, Appenders } from './appenders/appenders';

// We need this helper for the types to be correct
// (otherwise it assumes an array of A|B instead of a tuple [A,B])
const toTuple = <A, B>(a: A, b: B): [A, B] => [a, b];

/**
 * Separator string that used within nested context name (eg. plugins.pid).
 */
const CONTEXT_SEPARATOR = '.';

/**
 * Name of the `root` context that always exists and sits at the top of logger hierarchy.
 */
const ROOT_CONTEXT_NAME = 'root';

/**
 * Name of the appender that is always presented and used by `root` logger by default.
 */
const DEFAULT_APPENDER_NAME = 'default';

const createLevelSchema = schema.oneOf(
  [
    schema.literal('all'),
    schema.literal('fatal'),
    schema.literal('error'),
    schema.literal('warn'),
    schema.literal('info'),
    schema.literal('debug'),
    schema.literal('trace'),
    schema.literal('off'),
  ],
  {
    defaultValue: 'info',
  }
);

const createLoggerSchema = schema.object({
  appenders: schema.arrayOf(schema.string(), { defaultValue: [] }),
  context: schema.string(),
  level: createLevelSchema,
});

/** @internal */
export type LoggerConfigType = TypeOf<typeof createLoggerSchema>;
export const config = {
  path: 'logging',
  schema: schema.object({
    appenders: schema.mapOf(schema.string(), Appenders.configSchema, {
      defaultValue: new Map<string, AppenderConfigType>(),
    }),
    loggers: schema.arrayOf(createLoggerSchema, {
      defaultValue: [],
    }),
    root: schema.object({
      appenders: schema.arrayOf(schema.string(), {
        defaultValue: [DEFAULT_APPENDER_NAME],
        minSize: 1,
      }),
      level: createLevelSchema,
    }),
  }),
};

export type LoggingConfigType = TypeOf<typeof config.schema>;

/**
 * Describes the config used to fully setup logging subsystem.
 * @internal
 */
export class LoggingConfig {
  /**
   * Helper method that joins separate string context parts into single context string.
   * In case joined context is an empty string, `root` context name is returned.
   * @param contextParts List of the context parts (e.g. ['parent', 'child'].
   * @returns {string} Joined context string (e.g. 'parent.child').
   */
  public static getLoggerContext(contextParts: string[]) {
    return contextParts.join(CONTEXT_SEPARATOR) || ROOT_CONTEXT_NAME;
  }

  /**
   * Helper method that returns parent context for the specified one.
   * @param context Context to find parent for.
   * @returns Name of the parent context or `root` if the context is the top level one.
   */
  public static getParentLoggerContext(context: string) {
    const lastIndexOfSeparator = context.lastIndexOf(CONTEXT_SEPARATOR);
    if (lastIndexOfSeparator === -1) {
      return ROOT_CONTEXT_NAME;
    }

    return context.slice(0, lastIndexOfSeparator);
  }

  /**
   * Map of the appender unique arbitrary key and its corresponding config.
   */
  public readonly appenders: Map<string, AppenderConfigType> = new Map([
    [
      DEFAULT_APPENDER_NAME,
      {
        kind: 'console',
        layout: { kind: 'pattern', highlight: true },
      } as AppenderConfigType,
    ],
  ]);

  /**
   * Map of the logger unique arbitrary key (context) and its corresponding config.
   */
  public readonly loggers: Map<string, LoggerConfigType> = new Map();

  constructor(configType: LoggingConfigType) {
    this.fillAppendersConfig(configType);
    this.fillLoggersConfig(configType);
  }

  private fillAppendersConfig(loggingConfig: LoggingConfigType) {
    for (const [appenderKey, appenderSchema] of loggingConfig.appenders) {
      this.appenders.set(appenderKey, appenderSchema);
    }
  }

  private fillLoggersConfig(loggingConfig: LoggingConfigType) {
    // Include `root` logger into common logger list so that it can easily be a part
    // of the logger hierarchy and put all the loggers in map for easier retrieval.
    const loggers = [
      { context: ROOT_CONTEXT_NAME, ...loggingConfig.root },
      ...loggingConfig.loggers,
    ];

    const loggerConfigByContext = new Map(
      loggers.map(loggerConfig => toTuple(loggerConfig.context, loggerConfig))
    );

    for (const [loggerContext, loggerConfig] of loggerConfigByContext) {
      // Ensure logger config only contains valid appenders.
      const unsupportedAppenderKey = loggerConfig.appenders.find(
        appenderKey => !this.appenders.has(appenderKey)
      );

      if (unsupportedAppenderKey) {
        throw new Error(
          `Logger "${loggerContext}" contains unsupported appender key "${unsupportedAppenderKey}".`
        );
      }

      const appenders = getAppenders(loggerConfig, loggerConfigByContext);

      // We expect `appenders` to never be empty at this point, since the `root` context config should always
      // have at least one appender that is enforced by the config schema validation.
      this.loggers.set(loggerContext, {
        ...loggerConfig,
        appenders,
      });
    }
  }
}

/**
 * Get appenders for logger config.
 *
 * If config for current context doesn't have any defined appenders inherit
 * appenders from the parent context config.
 */
function getAppenders(
  loggerConfig: LoggerConfigType,
  loggerConfigByContext: Map<string, LoggerConfigType>
) {
  let currentContext = loggerConfig.context;
  let appenders = loggerConfig.appenders;

  while (appenders.length === 0) {
    const parentContext = LoggingConfig.getParentLoggerContext(currentContext);

    const parentLogger = loggerConfigByContext.get(parentContext);
    if (parentLogger) {
      appenders = parentLogger.appenders;
    }

    currentContext = parentContext;
  }

  return appenders;
}
