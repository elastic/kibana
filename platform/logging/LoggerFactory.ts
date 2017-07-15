import { LoggingConfig, LoggerConfig } from './LoggingConfig';
import { LogLevel } from './LogLevel';
import { Logger, BaseLogger, LoggerAdapter } from './Logger';
import { BaseAppender } from './appenders/base/BaseAppender';
import { BaseAppenderConfig } from './appenders/base/BaseAppenderConfig';
import { BufferAppender } from './appenders/buffer/BufferAppender';

const BUFFERED_APPENDER_KEY = '__buffer__';

export interface LoggerFactory {
  get(context: string): Logger;
}

export class MutableLoggerFactory implements LoggerFactory {
  private config?: LoggingConfig;
  private readonly appenders: Map<string, BaseAppender> = new Map([
    [BUFFERED_APPENDER_KEY, new BufferAppender(
      new BaseAppenderConfig({ kind: 'buffer', pattern: '' })
    )]
  ]);
  private readonly loggers: Map<string, LoggerAdapter> = new Map();

  get(context: string): Logger {
    if (this.loggers.has(context)) {
      return this.loggers.get(context)!;
    }

    let loggerConfig;
    if (this.config) {
      loggerConfig = this.getLoggerConfigByContext(this.config, context)!;
    } else {
      // If we don't have config yet, use `buffered` appender that will store all logged messages in the memory
      // until the config is ready.
      loggerConfig = { level: LogLevel.All, appenders: [BUFFERED_APPENDER_KEY] };
    }

    this.loggers.set(context,
      new LoggerAdapter(
        new BaseLogger(
          context,
          loggerConfig.level,
          loggerConfig.appenders.map((appenderKey) => this.appenders.get(appenderKey)!)
        )
      )
    );

    return this.loggers.get(context)!;
  }

  updateConfig(config: LoggingConfig) {
    // TODO: Should we support `config.isEqual()` to avoid updating the config if it's still the same?
    this.config = config;

    // Before we dispose appenders, let's check whether we have any `buffered` appender that may need to be
    // flushed via newly configured appenders.
    const bufferedLogRecords = this.appenders.has(BUFFERED_APPENDER_KEY) ?
      [...(<BufferAppender>this.appenders.get(BUFFERED_APPENDER_KEY)!).buffer] :
      [];

    this.updateAppendersFromConfig(config);
    this.updateLoggersFromConfig(config);

    // Re-log all buffered log records with newly configured appenders.
    for (const logRecord of bufferedLogRecords) {
      this.get(logRecord.context).log(logRecord);
    }
  }

  async close() {
    for (const appender of this.appenders.values()) {
      await appender.close();
    }

    this.appenders.clear();
    this.loggers.clear();
  }

  private updateAppendersFromConfig(config: LoggingConfig) {
    for (const appender of this.appenders.values()) {
      appender.close();
    }

    this.appenders.clear();

    for (const [appenderKey, appenderConfig] of config.appenders.entries()) {
      this.appenders.set(appenderKey, appenderConfig.createAppender());
    }
  }

  private updateLoggersFromConfig(config: LoggingConfig) {
    for (const [loggerKey, loggerAdapter] of this.loggers.entries()) {
      const loggerConfig = this.getLoggerConfigByContext(config, loggerKey);
      loggerAdapter.logger = new BaseLogger(
        loggerKey,
        loggerConfig.level,
        loggerConfig.appenders.map((appenderKey) => this.appenders.get(appenderKey)!)
      );
    }
  }

  private getLoggerConfigByContext(config: LoggingConfig, context: string): LoggerConfig {
    const loggerConfig = config.loggers.get(context);
    if (loggerConfig) {
      return loggerConfig;
    }

    // If we don't have configuration for the specified context and it's the "nested" one (eg. `foo.bar.baz`),
    // let's move up to the parent context (eg. `foo.bar`) and check if it has config we can rely on. Otherwise
    // we fallback to the `root` context that should always be defined (enforced by configuration schema).
    return this.getLoggerConfigByContext(
      config,
      LoggingConfig.getParentLoggerContext(context)
    );
  }
}
