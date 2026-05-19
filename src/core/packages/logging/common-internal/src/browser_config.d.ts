import type { LogLevelId } from '@kbn/logging';
/**
 * @internal
 */
export interface BrowserLoggingConfig {
    root: BrowserRootLoggerConfig;
    loggers: BrowserLoggerConfig[];
}
export interface BrowserLoggerConfig {
    name: string;
    level: LogLevelId;
}
/**
 * @internal
 */
export interface BrowserRootLoggerConfig {
    level: LogLevelId;
}
