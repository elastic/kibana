/**
 * A failure to write to a log file, reported to a {@link LogFileWriteErrorHandler}.
 *
 * @public
 */
export interface LogFileWriteError {
    /** The absolute path that could not be written. */
    path: string;
    /** The `NodeJS.ErrnoException` code, e.g. `ENOSPC`, `EDQUOT`, `EROFS`, `EACCES`. */
    code?: string;
    reason: string;
}
/**
 * Called when a file-backed appender cannot write, instead of letting the failure reach the
 * process as an `uncaughtException`.
 *
 * @public
 */
export type LogFileWriteErrorHandler = (error: LogFileWriteError) => void;
