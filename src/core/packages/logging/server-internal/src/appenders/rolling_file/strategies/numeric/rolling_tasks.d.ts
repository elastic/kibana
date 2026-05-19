export declare const shouldSkipRollout: ({ logFilePath }: {
    logFilePath: string;
}) => Promise<boolean>;
/**
 * Returns the rolled file basenames, from the most recent to the oldest.
 */
export declare const getOrderedRolledFiles: ({ logFileBaseName, logFileFolder, pattern, }: {
    logFileFolder: string;
    logFileBaseName: string;
    pattern: string;
}) => Promise<string[]>;
export declare const rollPreviousFilesInOrder: ({ filesToRoll, logFileFolder, logFileBaseName, pattern, }: {
    logFileFolder: string;
    logFileBaseName: string;
    pattern: string;
    filesToRoll: string[];
}) => Promise<void>;
export declare const rollCurrentFile: ({ logFileFolder, logFileBaseName, pattern, }: {
    logFileFolder: string;
    logFileBaseName: string;
    pattern: string;
}) => Promise<void>;
