import { Schema, typeOfSchema } from '../types';
import { LogLevelId } from './LogLevel';
import { Appenders, AppenderConfigType } from './appenders/Appenders';

/**
 * Separator string that used within nested context name (eg. plugins::pid).
 */
const CONTEXT_SEPARATOR = '::';

/**
 * Name of the `root` context that should always be defined.
 */
const ROOT_CONTEXT_NAME = 'root';

const createLoggerSchema = (schema: Schema) => {
  const { literal, object, string, arrayOf, oneOf } = schema;

  return object({
    level: oneOf(
      [
        literal('all'),
        literal('fatal'),
        literal('error'),
        literal('warn'),
        literal('info'),
        literal('debug'),
        literal('trace'),
        literal('off')
      ],
      {
        defaultValue: 'info'
      }
    ),
    appenders: arrayOf(string(), { defaultValue: [] })
  });
};

const createLoggingSchema = (schema: Schema) => {
  const { object, string, mapOf } = schema;

  return object({
    appenders: mapOf(string(), Appenders.createConfigSchema(schema), {
      defaultValue: new Map([
        [
          'console',
          {
            kind: 'console',
            layout: {
              kind: 'pattern',
              highlight: true
            }
          }
        ]
      ])
    }),
    loggers: mapOf(string(), createLoggerSchema(schema), {
      defaultValue: new Map([
        ['root', { appenders: ['console'], level: 'info' as LogLevelId }]
      ]),
      validate(value) {
        const rootLogger = value.get(ROOT_CONTEXT_NAME);
        if (!rootLogger) {
          throw new Error(
            `"${ROOT_CONTEXT_NAME}" logger should be configured!`
          );
        }

        if (rootLogger.appenders.length === 0) {
          throw new Error(
            `"${ROOT_CONTEXT_NAME}" logger should have at least one "appender" configured.`
          );
        }
      }
    })
  });
};

const loggerConfigType = typeOfSchema(createLoggerSchema);
/** @internal */
export type LoggerConfigType = typeof loggerConfigType;

const loggingConfigType = typeOfSchema(createLoggingSchema);
type LoggingConfigType = typeof loggingConfigType;

/**
 * Class that describes config used to setup logging subsystem.
 * @internal
 */
export class LoggingConfig {
  static createSchema = createLoggingSchema;

  /**
   * Map of the appender unique arbitrary key and its corresponding config.
   */
  readonly appenders: Map<string, AppenderConfigType> = new Map();

  /**
   * Map of the logger unique arbitrary key (context) and its corresponding config.
   */
  readonly loggers: Map<string, LoggerConfigType> = new Map();

  constructor(schema: LoggingConfigType) {
    this.fillAppendersConfig(schema);
    this.fillLoggersConfig(schema);
  }

  /**
   * Helper method that returns parent context for the specified one.
   * @param context Context to find parent for.
   * @returns Name of the parent context or `root` if the context is the top level one.
   */
  static getParentLoggerContext(context: string) {
    const lastIndexOfSeparator = context.lastIndexOf(CONTEXT_SEPARATOR);
    if (lastIndexOfSeparator === -1) {
      return ROOT_CONTEXT_NAME;
    }

    return context.slice(0, lastIndexOfSeparator);
  }

  private fillAppendersConfig(schema: LoggingConfigType) {
    for (const [appenderKey, appenderSchema] of schema.appenders) {
      this.appenders.set(appenderKey, <AppenderConfigType>appenderSchema);
    }
  }

  private fillLoggersConfig(schema: LoggingConfigType) {
    for (let [loggerKey, loggerConfig] of schema.loggers) {
      // We can't check whether logger config refers to the existing appenders at the config schema
      // validation step, so we should do it here.
      const unsupportedAppenderKey = loggerConfig.appenders.find(
        appenderKey => !this.appenders.has(appenderKey)
      );

      if (unsupportedAppenderKey) {
        throw new Error(
          `Logger "${loggerKey}" contains unsupported appender key "${unsupportedAppenderKey}".`
        );
      }

      // If config for current context doesn't have any defined appenders we should inherit appenders
      // from the parent context config.
      let currentContext = loggerKey;
      let appenders = loggerConfig.appenders;
      while (appenders.length === 0) {
        const parentContext = LoggingConfig.getParentLoggerContext(
          currentContext
        );

        const parentLogger = schema.loggers.get(parentContext);
        if (parentLogger) {
          appenders = parentLogger.appenders;
        }

        currentContext = parentContext;
      }

      // We expect `appenders` to never be empty at this point, since the `root` context config should always
      // have at least one appender that is enforced by the config schema validation.
      this.loggers.set(loggerKey, {
        appenders,
        level: loggerConfig.level
      });
    }
  }
}
