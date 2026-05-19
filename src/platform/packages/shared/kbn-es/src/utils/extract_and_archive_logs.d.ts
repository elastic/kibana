import type { ToolingLog } from '@kbn/tooling-log';
/**
 * Extracts logs from Docker nodes, writes them to files, and returns the file paths.
 */
export declare function extractAndArchiveLogs({ outputFolder, log, nodeNames, }: {
    log: ToolingLog;
    nodeNames?: string[];
    outputFolder?: string;
}): Promise<string[] | undefined>;
