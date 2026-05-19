import type { LogRecord, Layout, DisposableAppender } from '@kbn/logging';
/**
 * Appender that formats all the `LogRecord` instances it receives and writes them to the specified file.
 * @internal
 */
export declare class FileAppender implements DisposableAppender {
    private readonly layout;
    private readonly path;
    static configSchema: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"file">;
        layout: import("@kbn/config-schema").Type<Readonly<{} & {
            type: "json";
        }> | Readonly<{
            pattern?: string | undefined;
            highlight?: boolean | undefined;
        } & {
            type: "pattern";
        }>>;
        fileName: import("@kbn/config-schema").Type<string>;
    }>;
    /**
     * Writable file stream to write formatted `LogRecord` to.
     */
    private outputStream?;
    /**
     * Creates FileAppender instance with specified layout and file path.
     * @param layout Instance of `Layout` sub-class responsible for `LogRecord` formatting.
     * @param path Path to the file where log records should be stored.
     */
    constructor(layout: Layout, path: string);
    /**
     * Formats specified `record` and writes them to the specified file.
     * @param record `LogRecord` instance to be logged.
     */
    append(record: LogRecord): void;
    /**
     * Disposes `FileAppender`. Waits for the underlying file stream to be completely flushed and closed.
     */
    dispose(): Promise<void>;
    private ensureDirectory;
}
