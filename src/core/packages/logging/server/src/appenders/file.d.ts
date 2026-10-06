import type { LayoutConfigType } from '../layout';
import type { LogFileWriteErrorHandler } from './write_error';
/**
 * Configuration of a file appender
 * @public
 */
export interface FileAppenderConfig {
    type: 'file';
    layout: LayoutConfigType;
    fileName: string;
}
/**
 * Plugin-only extension of {@link FileAppenderConfig}: options that cannot be expressed
 * in YAML, accepted exclusively through {@link LoggingServiceSetup.configure}.
 *
 * @public
 */
export interface FileAppenderPluginConfig extends FileAppenderConfig {
    /**
     * Opts this appender out of crashing the process when the log file cannot be written.
     * See {@link LogFileWriteErrorHandler}.
     */
    onWriteError?: LogFileWriteErrorHandler;
}
