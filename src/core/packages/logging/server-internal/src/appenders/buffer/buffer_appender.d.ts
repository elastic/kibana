import type { LogRecord, DisposableAppender } from '@kbn/logging';
/**
 * Simple appender that just buffers `LogRecord` instances it receives. It is a *reserved* appender
 * that can't be set via configuration file.
 * @internal
 */
export declare class BufferAppender implements DisposableAppender {
    /**
     * List of the buffered `LogRecord` instances.
     */
    private readonly buffer;
    /**
     * Appends new `LogRecord` to the buffer.
     * @param record `LogRecord` instance to add to the buffer.
     */
    append(record: LogRecord): void;
    /**
     * Clears buffer and returns all records that it had.
     */
    flush(): LogRecord[];
    /**
     * Disposes `BufferAppender` and clears internal `LogRecord` buffer.
     */
    dispose(): Promise<void>;
}
