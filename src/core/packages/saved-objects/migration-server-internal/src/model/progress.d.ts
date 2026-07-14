import type { MigrationLog, Progress } from '../types';
/**
 * Returns an initial state of the progress object (everything undefined)
 */
export declare function createInitialProgress(): Progress;
/**
 * Overwrites the total of the progress if anything provided
 * @param previousProgress
 * @param total
 */
export declare function setProgressTotal(previousProgress: Progress, total?: number | undefined): Progress;
/**
 * Returns a new list of MigrationLogs with the info entry about the progress
 * @param previousLogs
 * @param progress
 */
export declare function logProgress(previousLogs: MigrationLog[], progress: Progress): MigrationLog[];
/**
 * Increments the processed count and returns a new Progress
 * @param previousProgress Previous state of the progress
 * @param incrementProcessedBy Amount to increase the processed count by
 */
export declare function incrementProcessedProgress(previousProgress: Progress, incrementProcessedBy?: number): Progress;
