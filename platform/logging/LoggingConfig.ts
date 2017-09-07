import { Schema, typeOfSchema } from '../types/schema';
import { Appenders, AppenderConfigType } from './appenders/Appenders';

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

const createLevelSchema = ({ literal, oneOf }: Schema) => {
  return oneOf(
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
  );
};

const createLoggerSchema = (schema: Schema) => {
  const { object, string, arrayOf } = schema;

  return object({
    context: string(),
    level: createLevelSchema(schema),
    appenders: arrayOf(string(), { defaultValue: [] })
  });
};

const createLoggingSchema = (schema: Schema) => {
  const { arrayOf, object, string, mapOf } = schema;

  return object({
    appenders: mapOf(string(), Appenders.createConfigSchema(schema), {
      defaultValue: new Map()
    }),
    root: object({
      level: createLevelSchema(schema),
      appenders: arrayOf(string(), {
        defaultValue: [DEFAULT_APPENDER_NAME],
        minSize: 1
      })
    }),
    loggers: arrayOf(createLoggerSchema(schema), { defaultValue: [] })
  });
};

const loggerConfigType = typeOfSchema(createLoggerSchema);
/** @internal */
export type LoggerConfigType = typeof loggerConfigType;

const loggingConfigType = typeOfSchema(createLoggingSchema);
type LoggingConfigType = typeof loggingConfigType;

/**
 * Describes the config used to fully setup logging subsystem.
 * @internal
 */
export class LoggingConfig {
  static createSchema = createLoggingSchema;

  /**
   * Map of the appender unique arbitrary key and its corresponding config.
   */
  readonly appenders: Map<string, AppenderConfigType> = new Map([
    [
      DEFAULT_APPENDER_NAME,
      {
        kind: 'console',
        layout: { kind: 'pattern', highlight: true }
      } as AppenderConfigType
    ]
  ]);

  /**
   * Map of the logger unique arbitrary key (context) and its corresponding config.
   */
  readonly loggers: Map<string, LoggerConfigType> = new Map();

  constructor(schema: LoggingConfigType) {
    this.fillAppendersConfig(schema);
    this.fillLoggersConfig(schema);
  }

  /**
   * Helper method that joins separate string context parts into single context string.
   * In case joined context is an empty string, `root` context name is returned.
   * @param contextParts List of the context parts (e.g. ['parent', 'child'].
   * @returns {string} Joined context string (e.g. 'parent.child').
   */
  static getLoggerContext(contextParts: string[]) {
    return contextParts.join(CONTEXT_SEPARATOR) || ROOT_CONTEXT_NAME;
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
      this.appenders.set(appenderKey, appenderSchema as AppenderConfigType);
    }
  }

  private fillLoggersConfig(schema: LoggingConfigType) {
    // Include `root` logger into common logger list so that it can easily be a part
    // of the logger hierarchy and put all the loggers in map for easier retrieval.
    const loggersMap = new Map(
      [
        { context: ROOT_CONTEXT_NAME, ...schema.root },
        ...schema.loggers
      ].map(loggerConfig => {
        return [loggerConfig.context, loggerConfig] as [
          string,
          LoggerConfigType
        ];
      })
    );

    for (let [loggerContext, loggerConfig] of loggersMap) {
      // We can't check whether logger config refers to the existing appenders at the config schema
      // validation step, so we should do it here.
      const unsupportedAppenderKey = loggerConfig.appenders.find(
        appenderKey => !this.appenders.has(appenderKey)
      );

      if (unsupportedAppenderKey) {
        throw new Error(
          `Logger "${loggerContext}" contains unsupported appender key "${unsupportedAppenderKey}".`
        );
      }

      // If config for current context doesn't have any defined appenders we should inherit appenders
      // from the parent context config.
      let currentContext = loggerConfig.context;
      let appenders = loggerConfig.appenders;
      while (appenders.length === 0) {
        const parentContext = LoggingConfig.getParentLoggerContext(
          currentContext
        );

        const parentLogger = loggersMap.get(parentContext);
        if (parentLogger) {
          appenders = parentLogger.appenders;
        }

        currentContext = parentContext;
      }

      // We expect `appenders` to never be empty at this point, since the `root` context config should always
      // have at least one appender that is enforced by the config schema validation.
      this.loggers.set(loggerContext, {
        ...loggerConfig,
        appenders
      });
    }
  }
}
