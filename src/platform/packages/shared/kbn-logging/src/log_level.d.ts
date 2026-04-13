/**
 * Possible log level string values.
 * @internal
 */
export type LogLevelId = 'all' | 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'off';
/**
 * Represents the log level, manages string to `LogLevel` conversion and comparison of log level
 * priorities between themselves.
 * @internal
 */
export declare class LogLevel {
    readonly id: LogLevelId;
    readonly value: number;
    static readonly Off: LogLevel;
    static readonly Fatal: LogLevel;
    static readonly Error: LogLevel;
    static readonly Warn: LogLevel;
    static readonly Info: LogLevel;
    static readonly Debug: LogLevel;
    static readonly Trace: LogLevel;
    static readonly All: LogLevel;
    /**
     * Converts string representation of log level into `LogLevel` instance.
     * @param level - String representation of log level.
     * @returns Instance of `LogLevel` class.
     */
    static fromId(level: LogLevelId): LogLevel;
    private constructor();
    /**
     * Indicates whether current log level covers the one that is passed as an argument.
     * @param level - Instance of `LogLevel` to compare to.
     * @returns True if specified `level` is covered by this log level.
     */
    supports(level: LogLevel): boolean;
}
