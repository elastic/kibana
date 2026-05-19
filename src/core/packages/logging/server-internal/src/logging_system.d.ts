import type { Logger, LoggerFactory, LogMeta } from '@kbn/logging';
import type { LoggerContextConfigInput } from '@kbn/core-logging-server';
import type { LoggingConfigType } from './logging_config';
/** @internal */
export interface ILoggingSystem extends LoggerFactory {
    asLoggerFactory(): LoggerFactory;
    upgrade(rawConfig?: LoggingConfigType): Promise<void>;
    setContextConfig(baseContextParts: string[], rawConfig: LoggerContextConfigInput): Promise<void>;
    setGlobalContext(meta: Partial<LogMeta>): void;
    stop(): Promise<void>;
}
/**
 * System that is responsible for maintaining loggers and logger appenders.
 * @internal
 */
export declare class LoggingSystem implements ILoggingSystem {
    /** The configuration set by the user. */
    private baseConfig?;
    /** The fully computed configuration extended by context-specific configurations set programmatically */
    private computedConfig?;
    private readonly appenders;
    private readonly bufferAppender;
    private readonly loggers;
    private readonly contextConfigs;
    private globalContext;
    constructor();
    get(...contextParts: string[]): Logger;
    /**
     * Safe wrapper that allows passing logging service as immutable LoggerFactory.
     */
    asLoggerFactory(): LoggerFactory;
    /**
     * Updates all current active loggers with the new config values.
     * @param rawConfig New config instance. if unspecified, the default logging configuration
     *                  will be used.
     */
    upgrade(rawConfig?: LoggingConfigType): Promise<void>;
    /**
     * Customizes the logging config for a specific context.
     *
     * @remarks
     * Assumes that that the `context` property of the individual items in `rawConfig.loggers`
     * are relative to the `baseContextParts`.
     *
     * @example
     * Customize the configuration for the plugins.data.search context.
     * ```ts
     * loggingSystem.setContextConfig(
     *   ['plugins', 'data'],
     *   {
     *     loggers: [{ name: 'search', appenders: ['default'] }]
     *   }
     * )
     * ```
     *
     * @param baseContextParts
     * @param rawConfig
     */
    setContextConfig(baseContextParts: string[], rawConfig: LoggerContextConfigInput): Promise<void>;
    /**
     * A mechanism for specifying some "global" {@link LogMeta} that we want
     * to inject into all log entries.
     *
     * @remarks
     * The provided context will be merged with the meta of each individual log
     * entry. In the case of conflicting keys, the global context will always be
     * overridden by the log entry.
     */
    setGlobalContext(meta: Partial<LogMeta>): void;
    /**
     * Disposes all loggers (closes log files, clears buffers etc.). Service is not usable after
     * calling of this method until new config is provided via `upgrade` method.
     * @returns Promise that is resolved once all loggers are successfully disposed.
     */
    stop(): Promise<void>;
    private createLogger;
    private getLoggerConfigByContext;
    /**
     * Retrieves an appender by the provided key, after first checking that no circular
     * dependencies exist between appender refs.
     */
    private getAppenderByRef;
    private applyBaseConfig;
    private enforceBufferAppendersUsage;
    private enforceConfiguredAppendersUsage;
}
