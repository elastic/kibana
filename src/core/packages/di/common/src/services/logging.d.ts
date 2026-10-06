import type { Logger as ILogger, LoggerFactory as ILoggerFactory } from '@kbn/logging';
/**
 * Plugin's default logger instance.
 * @public
 */
export declare const Logger: import("../token").ServiceToken<ILogger>;
/**
 * Plugin's logger factory.
 * @public
 */
export declare const LoggerFactory: import("../token").ServiceToken<ILoggerFactory>;
