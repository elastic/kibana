import type { ServiceIdentifier } from 'inversify';
import type { Logger as ILogger, LoggerFactory as ILoggerFactory } from '@kbn/logging';
/**
 * Plugin's default logger instance.
 * @public
 */
export declare const Logger: ServiceIdentifier<ILogger>;
/**
 * Plugin's logger factory.
 * @public
 */
export declare const LoggerFactory: ServiceIdentifier<ILoggerFactory>;
