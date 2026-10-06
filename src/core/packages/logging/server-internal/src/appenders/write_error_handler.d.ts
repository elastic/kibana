import type { LogFileWriteError } from '@kbn/core-logging-server';
/**
 * Schema fragment for the `onWriteError` option of the file-backed appenders; only ever wired
 * into the {@link LoggingServiceSetup.configure} validation path, never into YAML config.
 */
export declare const onWriteErrorSchema: import("@kbn/config-schema").Type<any>;
/** Maps a filesystem failure to the {@link LogFileWriteError} reported to the handler. */
export declare const toLogFileWriteError: (error: unknown, path: string) => LogFileWriteError;
