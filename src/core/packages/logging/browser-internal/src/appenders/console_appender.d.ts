import type { Layout, LogRecord, DisposableAppender } from '@kbn/logging';
/**
 *
 * Appender that formats all the `LogRecord` instances it receives and logs them via built-in `console`.
 * @internal
 */
export declare class ConsoleAppender implements DisposableAppender {
    private readonly layout;
    /**
     * Creates ConsoleAppender instance.
     * @param layout Instance of `Layout` sub-class responsible for `LogRecord` formatting.
     */
    constructor(layout: Layout);
    /**
     * Formats specified `record` and logs it via built-in `console`.
     * @param record `LogRecord` instance to be logged.
     */
    append(record: LogRecord): void;
    /**
     * Disposes `ConsoleAppender`.
     */
    dispose(): void;
}
