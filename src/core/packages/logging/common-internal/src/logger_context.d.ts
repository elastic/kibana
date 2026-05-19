/**
 * Separator string that used within nested context name (eg. plugins.pid).
 */
export declare const CONTEXT_SEPARATOR = ".";
/**
 * Name of the `root` context that always exists and sits at the top of logger hierarchy.
 */
export declare const ROOT_CONTEXT_NAME = "root";
/**
 * Name of the appender that is always presented and used by `root` logger by default.
 */
export declare const DEFAULT_APPENDER_NAME = "default";
/**
 * Helper method that joins separate string context parts into single context string.
 * In case joined context is an empty string, `root` context name is returned.
 * @param contextParts List of the context parts (e.g. ['parent', 'child'].
 * @returns {string} Joined context string (e.g. 'parent.child').
 */
export declare const getLoggerContext: (contextParts: string[]) => string;
/**
 * Helper method that returns parent context for the specified one.
 * @param context Context to find parent for.
 * @returns Name of the parent context or `root` if the context is the top level one.
 */
export declare const getParentLoggerContext: (context: string) => string;
