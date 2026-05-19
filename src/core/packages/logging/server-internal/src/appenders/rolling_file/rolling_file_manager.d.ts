import type { RollingFileContext } from './rolling_file_context';
/**
 * Delegate of the {@link RollingFileAppender} used to manage the log file access
 */
export declare class RollingFileManager {
    private readonly context;
    private readonly filePath;
    private outputStream?;
    constructor(context: RollingFileContext);
    write(chunk: string): void;
    closeStream(): Promise<void>;
    private ensureStreamOpen;
    private ensureDirectory;
}
