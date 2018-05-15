import { schema, TypeOf } from '../config/schema';
import { Appenders, AppenderConfigType } from './appenders/appenders';

const { literal, oneOf, object, string, arrayOf, mapOf } = schema;

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

const createLevelSchema = oneOf(
  [
    literal('all'),
    literal('fatal'),
    literal('error'),
    literal('warn'),
    literal('info'),
    literal('debug'),
    literal('trace'),
    literal('off'),
  ],
  {
    defaultValue: 'info',
  }
);

const createLoggerSchema = object({
  context: string(),
  level: createLevelSchema,
  appenders: arrayOf(string(), { defaultValue: [] }),
});

const loggingSchema = object({
  appenders: mapOf(string(), Appenders.configSchema, {
    defaultValue: new Map<string, AppenderConfigType>(),
  }),
  root: object({
    level: createLevelSchema,
    appenders: arrayOf(string(), {
      defaultValue: [DEFAULT_APPENDER_NAME],
      minSize: 1,
    }),
  }),
  loggers: arrayOf(createLoggerSchema, {
    defaultValue: [],
  }),
});

/** @internal */
export type LoggerConfigType = TypeOf<typeof createLoggerSchema>;

type LoggingConfigType = TypeOf<typeof loggingSchema>;

/**
 * Describes the config used to fully setup logging subsystem.
 * @internal
 */
export class LoggingConfig {
  static schema = loggingSchema;

  /**
   * Map of the appender unique arbitrary key and its corresponding config.
   */
  readonly appenders: Map<string, AppenderConfigType> = new Map([
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
