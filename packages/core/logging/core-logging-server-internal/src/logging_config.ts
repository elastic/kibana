/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  ROOT_CONTEXT_NAME,
  DEFAULT_APPENDER_NAME,
  getLoggerContext,
  getParentLoggerContext,
} from '@kbn/core-logging-common-internal';
import type { AppenderConfigType, LoggerConfigType } from '@kbn/core-logging-server';
import { Appenders } from './appenders/appenders';

// We need this helper for the types to be correct
// (otherwise it assumes an array of A|B instead of a tuple [A,B])
const toTuple = <A, B>(a: A, b: B): [A, B] => [a, b];

const levelSchema = schema.oneOf(
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

// until we have feature parity between browser and server logging, we need to define distinct logger schemas
const browserLoggerSchema = schema.object({
  name: schema.string(),
  level: levelSchema,
});

const browserConfig = schema.object({
  root: schema.object({
    level: levelSchema,
  }),
  loggers: schema.arrayOf(browserLoggerSchema, {
    defaultValue: [],
  }),
});

/**
 * Config schema for validating the `loggers` key in {@link LoggerContextConfigType} or {@link LoggingConfigType}.
 *
 * @public
 */
export const loggerSchema = schema.object({
  appenders: schema.arrayOf(schema.string(), { defaultValue: [] }),
  name: schema.string(),
  level: levelSchema,
});

export const config = {
  path: 'logging',
  schema: schema.object({
    appenders: schema.mapOf(schema.string(), Appenders.configSchema, {
      defaultValue: new Map<string, AppenderConfigType>(),
    }),
    loggers: schema.arrayOf(loggerSchema, {
      defaultValue: [],
    }),
    root: schema.object({
      appenders: schema.arrayOf(schema.string(), {
        defaultValue: [DEFAULT_APPENDER_NAME],
        minSize: 1,
      }),
      level: levelSchema,
    }),
    browser: browserConfig,
  }),
};

/** @internal */
export type LoggingConfigType = Pick<TypeOf<typeof config.schema>, 'loggers' | 'root'> & {
  appenders: Map<string, AppenderConfigType>;
};

/** @internal */
export type LoggingConfigWithBrowserType = LoggingConfigType &
  Pick<TypeOf<typeof config.schema>, 'browser'>;

/**
 * Config schema for validating the inputs to the {@link LoggingServiceStart.configure} API.
 * See {@link LoggerContextConfigType}.
 *
 * @public
 */
export const loggerContextConfigSchema = schema.object({
  appenders: schema.mapOf(schema.string(), Appenders.configSchema, {
    defaultValue: new Map<string, AppenderConfigType>(),
  }),

  loggers: schema.arrayOf(loggerSchema, { defaultValue: [] }),
});

/** @public */
export type LoggerContextConfigType = TypeOf<typeof loggerContextConfigSchema>;

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
    return getLoggerContext(contextParts);
  }

  /**
   * Helper method that returns parent context for the specified one.
   * @param context Context to find parent for.
   * @returns Name of the parent context or `root` if the context is the top level one.
   */
  public static getParentLoggerContext(context: string) {
    return getParentLoggerContext(context);
  }

  /**
   * Map of the appender unique arbitrary key and its corresponding config.
   */
  public readonly appenders: Map<string, AppenderConfigType> = new Map([
    [
      'default',
      {
        type: 'console',
        layout: { type: 'pattern', highlight: true },
      } as AppenderConfigType,
    ],
    [
      'console',
      {
        type: 'console',
        layout: { type: 'pattern', highlight: true },
      } as AppenderConfigType,
    ],
  ]);

  /**
   * Map of the logger unique arbitrary key (context) and its corresponding config.
   */
  public readonly loggers: Map<string, LoggerConfigType> = new Map();

  constructor(private readonly configType: LoggingConfigType) {
    this.fillAppendersConfig(configType);
    this.fillLoggersConfig(configType);
  }

  /**
   * Returns a new LoggingConfig that merges the existing config with the specified config.
   *
   * @remarks
   * Does not support merging the `root` config property.
   *
   * @param contextConfig
   */
  public extend(contextConfig: LoggerContextConfigType) {
    // Use a Map to de-dupe any loggers for the same context. contextConfig overrides existing config.
    const mergedLoggers = new Map<string, LoggerConfigType>([
      ...this.configType.loggers.map((l) => [l.name, l] as [string, LoggerConfigType]),
      ...contextConfig.loggers.map((l) => [l.name, l] as [string, LoggerConfigType]),
    ]);

    const mergedConfig: LoggingConfigType = {
      appenders: new Map([...this.configType.appenders, ...contextConfig.appenders]),
      loggers: [...mergedLoggers.values()],
      root: this.configType.root,
    };

    return new LoggingConfig(mergedConfig);
  }

  private fillAppendersConfig(loggingConfig: LoggingConfigType) {
    for (const [appenderKey, appenderSchema] of loggingConfig.appenders) {
      this.appenders.set(appenderKey, appenderSchema);
    }
  }

  private fillLoggersConfig(loggingConfig: LoggingConfigType) {
    // Include `root` logger into common logger list so that it can easily be a part
    // of the logger hierarchy and put all the loggers in map for easier retrieval.
    const loggers = [{ name: ROOT_CONTEXT_NAME, ...loggingConfig.root }, ...loggingConfig.loggers];

    const loggerConfigByContext = new Map(
      loggers.map((loggerConfig) => toTuple(loggerConfig.name, loggerConfig))
    );

    for (const [loggerContext, loggerConfig] of loggerConfigByContext) {
      // Ensure logger config only contains valid appenders.
      const unsupportedAppenderKey = loggerConfig.appenders.find(
        (appenderKey) => !this.appenders.has(appenderKey)
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
  let currentContext = loggerConfig.name;
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
