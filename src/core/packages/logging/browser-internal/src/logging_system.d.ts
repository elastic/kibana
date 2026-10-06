import type { Logger, LoggerFactory } from '@kbn/logging';
import type { BrowserLoggingConfig } from '@kbn/core-logging-common-internal';
/**
 * @internal
 */
export interface IBrowserLoggingSystem extends LoggerFactory {
    asLoggerFactory(): LoggerFactory;
}
/**
 * @internal
 */
export declare class BrowserLoggingSystem implements IBrowserLoggingSystem {
    private readonly computedConfig;
    private readonly loggers;
    private readonly appenders;
    constructor(loggingConfig: BrowserLoggingConfig);
    get(...contextParts: string[]): Logger;
    private createLogger;
    private getLoggerConfigByContext;
    private setupSystem;
    /**
     * Safe wrapper that allows passing logging service as immutable LoggerFactory.
     */
    asLoggerFactory(): LoggerFactory;
}
