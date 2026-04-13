import type { Logger } from './logger';
/**
 * The single purpose of `LoggerFactory` interface is to define a way to
 * retrieve a context-based logger instance.
 *
 * @public
 */
export interface LoggerFactory {
    /**
     * Returns a `Logger` instance for the specified context.
     *
     * @param contextParts - Parts of the context to return logger for. For example
     * get('plugins', 'pid') will return a logger for the `plugins.pid` context.
     */
    get(...contextParts: string[]): Logger;
}
