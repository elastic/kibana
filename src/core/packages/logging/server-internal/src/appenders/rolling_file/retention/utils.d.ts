import { type Duration } from 'moment-timezone';
export declare const listFilesExceedingSize: ({ orderedFiles, maxSizeInBytes, }: {
    orderedFiles: string[];
    maxSizeInBytes: number;
}) => Promise<string[]>;
export declare const listFilesOlderThan: ({ orderedFiles, duration, }: {
    orderedFiles: string[];
    duration: Duration;
}) => Promise<string[]>;
