import * as schema from '../lib/schema';
import { typeOfSchema } from '../types';
import { LogLevel } from './LogLevel';
import { BaseAppenderConfig, BaseAppenderConfigSchemaType } from './appenders/base/BaseAppenderConfig';
import { ConsoleAppenderConfig } from './appenders/console/ConsoleAppenderConfig';
import { FileAppenderConfig } from './appenders/file/FileAppenderConfig';
import { RollingFileAppenderConfig } from './appenders/rolling-file/RollingFileAppenderConfig';

const CONTEXT_SEPARATOR = '::';
const ROOT_CONTEXT_NAME = 'root';

const KNOWN_APPENDERS = new Map<string, new (schema:  BaseAppenderConfigSchemaType) => BaseAppenderConfig>([
  ['console', ConsoleAppenderConfig],
  ['file', FileAppenderConfig],
  ['rolling-file', RollingFileAppenderConfig]
]);

const createLoggerSchema = () => {
  return schema.object({
    appenders: schema.mapOf(schema.string(), schema.oneOf([
      ConsoleAppenderConfig.getSchema(),
      FileAppenderConfig.getSchema(),
      RollingFileAppenderConfig.getSchema()
    ])),
    loggers: schema.mapOf(schema.string(), schema.object({
      level: schema.oneOf([
        schema.literal('all'),
        schema.literal('fatal'),
        schema.literal('error'),
        schema.literal('warn'),
        schema.literal('info'),
        schema.literal('debug'),
        schema.literal('trace'),
        schema.literal('off')
      ], {
        defaultValue: 'info'
      }),
      appenders: schema.arrayOf(schema.string(), { defaultValue: [] })
    }), {
      validate(value) {
        const rootLogger = value.get(ROOT_CONTEXT_NAME);
        if (!rootLogger) {
          throw new Error(`"${ROOT_CONTEXT_NAME}" logger should be configured!`);
        }

        if (rootLogger.appenders.length === 0) {
          throw new Error(`"${ROOT_CONTEXT_NAME}" logger should have at least one "appender" configured.`);
        }
      }
    })
  });
};

const loggingConfigType = typeOfSchema(createLoggerSchema);
type LoggingConfigType = typeof loggingConfigType;

export interface LoggerConfig {
  appenders: string[];
  level: LogLevel;
}

export class LoggingConfig {
  static createSchema = createLoggerSchema;
  readonly appenders: Map<string, BaseAppenderConfig> = new Map();
  readonly loggers: Map<string, LoggerConfig> = new Map();

  constructor(config: LoggingConfigType) {
    this.fillAppendersConfig(config);
    this.fillLoggersConfig(config);
  }

  static getParentLoggerContext(context: string) {
    const lastIndexOfSeparator = context.lastIndexOf(CONTEXT_SEPARATOR);
    if (lastIndexOfSeparator === -1) {
      return ROOT_CONTEXT_NAME;
    }

    return context.slice(0, lastIndexOfSeparator);
  }

  private fillAppendersConfig(config: LoggingConfigType) {
    for (const [appenderKey, appenderConfig] of config.appenders) {
      const AppenderConfigType = KNOWN_APPENDERS.get(appenderConfig.kind)!;
      this.appenders.set(appenderKey, new AppenderConfigType(appenderConfig));
    }
  }

  private fillLoggersConfig(config: LoggingConfigType) {
    for (let [loggerKey, loggerConfig] of config.loggers) {
      // We can't check whether logger config refers to the existing appenders at the config schema
      // validation step, so we should do it here.
      const unsupportedAppenderKey = loggerConfig.appenders.find(
        (appenderKey) => !this.appenders.has(appenderKey)
      );

      if (unsupportedAppenderKey) {
        throw new Error(`Logger "${loggerKey}" contains unsupported appender key "${unsupportedAppenderKey}".`);
      }

      // If config for current context doesn't have any defined appenders we should inherit appenders
      // from the parent context config.
      let currentContext = loggerKey;
      let appenders = loggerConfig.appenders;
      while(appenders.length === 0) {
        const parentContext = LoggingConfig.getParentLoggerContext(currentContext);

        const parentLogger = config.loggers.get(parentContext);
        if (parentLogger) {
          appenders = parentLogger.appenders;
        }

        currentContext = parentContext;
      }

      // We expect `appenders` to never be empty at this point, since the `root` context config should always
      // have at least one appender that is enforced by the config schema validation.
      this.loggers.set(loggerKey, {
        appenders,
        level: LogLevel.fromId(loggerConfig.level)
      });
    }
  }
}
