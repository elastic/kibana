import type { LogRecord, Layout, DisposableAppender } from '@kbn/logging';
import type { LogFileWriteErrorHandler } from '@kbn/core-logging-server';
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
            highlight?: boolean | undefined;
            pattern?: string | undefined;
        } & {
            type: "pattern";
        }>>;
        fileName: import("@kbn/config-schema").Type<string>;
    }>;
    /**
     * {@link FileAppender.configSchema} plus the plugin-only `onWriteError` handler; used only by
     * the {@link LoggingServiceSetup.configure} validation path, never wired into YAML config.
     */
    static runtimeConfigSchema: import("@kbn/config-schema").ObjectType<Omit<{
        type: import("@kbn/config-schema").Type<"file">;
        layout: import("@kbn/config-schema").Type<Readonly<{} & {
            type: "json";
        }> | Readonly<{
            highlight?: boolean | undefined;
            pattern?: string | undefined;
        } & {
            type: "pattern";
        }>>;
        fileName: import("@kbn/config-schema").Type<string>;
    }, "onWriteError"> & {
        onWriteError: import("@kbn/config-schema").Type<any>;
    }>;
    /**
     * Writable file stream to write formatted `LogRecord` to.
     */
    private outputStream?;
    private readonly reportWriteError?;
    /**
     * Creates FileAppender instance with specified layout and file path.
     * @param layout Instance of `Layout` sub-class responsible for `LogRecord` formatting.
     * @param path Path to the file where log records should be stored.
     * @param onWriteError Opts out of crashing the process when the file cannot be written. Ignored
     *   unless it is a function, so a stray YAML value cannot alter the default crash behavior.
     */
    constructor(layout: Layout, path: string, onWriteError?: LogFileWriteErrorHandler);
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
