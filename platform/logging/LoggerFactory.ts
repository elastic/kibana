import { LoggingConfig, LoggerConfigType } from './LoggingConfig';
import { LogLevel } from './LogLevel';
import { Logger, BaseLogger, LoggerAdapter } from './Logger';
import { Appenders, DisposableAppender } from './appenders/Appenders';
import { BufferAppender } from './appenders/buffer/BufferAppender';

/**
 * Interface that defines a way to retrieve a logger.
 */
export interface LoggerFactory {
  /**
   * Returns a `Logger` instance for the specified context.
   * @param context Context to return logger for.
   */
  get(context: string): Logger;
}

/**
 * @internal
 */
export class MutableLoggerFactory implements LoggerFactory {
  private config?: LoggingConfig;
  private readonly appenders: Map<string, DisposableAppender> = new Map();
  private readonly bufferAppender = new BufferAppender();
  private readonly loggers: Map<string, LoggerAdapter> = new Map();

  get(context: string): Logger {
    if (this.loggers.has(context)) {
      return this.loggers.get(context)!;
    }

    let loggerLevel, loggerAppenders;
    if (this.config) {
      const { level, appenders } = this.getLoggerConfigByContext(
        this.config,
        context
      )!;
      loggerLevel = LogLevel.fromId(level);
      loggerAppenders = appenders.map(
        appenderKey => this.appenders.get(appenderKey)!
      );
    } else {
      // If we don't have config yet, use `buffered` appender that will store all logged messages in the memory
      // until the config is ready.
      loggerLevel = LogLevel.All;
      loggerAppenders = [this.bufferAppender];
    }

    this.loggers.set(
      context,
      new LoggerAdapter(new BaseLogger(context, loggerLevel, loggerAppenders))
    );

    return this.loggers.get(context)!;
  }

  /**
   * Updates all current active loggers with the new config values.
   * @param config New config instance.
   * @returns Promise that is resolved once all loggers are successfully updated.
   */
  async updateConfig(config: LoggingConfig) {
    // Config update is asynchronous and may require some time to complete, so we should invalidate
    // config so that new loggers will be using BufferAppender until newly configured appenders are ready.
    // TODO: Before disposing of appenders, we should switch all existing loggers to BufferAppender first.
    this.config = undefined;

    for (const appender of this.appenders.values()) {
      await appender.dispose();
    }

    this.appenders.clear();
    for (const [appenderKey, appenderConfig] of config.appenders.entries()) {
      this.appenders.set(appenderKey, Appenders.create(appenderConfig));
    }

    for (const [loggerKey, loggerAdapter] of this.loggers.entries()) {
      const loggerConfig = this.getLoggerConfigByContext(config, loggerKey);
      loggerAdapter.logger = new BaseLogger(
        loggerKey,
        LogLevel.fromId(loggerConfig.level),
        loggerConfig.appenders.map(
          appenderKey => this.appenders.get(appenderKey)!
        )
      );
    }

    this.config = config;

    // Re-log all buffered log records with newly configured appenders.
    for (const logRecord of this.bufferAppender.flush()) {
      this.get(logRecord.context).log(logRecord);
    }
  }

  /**
   * Disposes all loggers (closes log files, clears buffers etc.). Factory is not usable after
   * calling of this method.
   * @returns Promise that is resolved once all loggers are successfully disposed.
   */
  async close() {
    for (const appender of this.appenders.values()) {
      await appender.dispose();
    }

    await this.bufferAppender.dispose();

    this.appenders.clear();
    this.loggers.clear();
  }

  private getLoggerConfigByContext(
    config: LoggingConfig,
    context: string
  ): LoggerConfigType {
    const loggerConfig = config.loggers.get(context);
    if (loggerConfig) {
      return loggerConfig;
    }

    // If we don't have configuration for the specified context and it's the "nested" one (eg. `foo::bar::baz`),
    // let's move up to the parent context (eg. `foo::bar`) and check if it has config we can rely on. Otherwise
    // we fallback to the `root` context that should always be defined (enforced by configuration schema).
    return this.getLoggerConfigByContext(
      config,
      LoggingConfig.getParentLoggerContext(context)
    );
  }
}
