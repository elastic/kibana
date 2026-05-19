import type { DownloadSnapshotOptions, InstallSnapshotOptions } from './types';
/**
 * Download an ES snapshot
 */
export declare function downloadSnapshot({ license, version, basePath, installPath, log, useCached, }: DownloadSnapshotOptions): Promise<{
    downloadPath: string;
}>;
/**
 * Installs ES from snapshot
 */
export declare function installSnapshot({ license, password, version, basePath, installPath, log, esArgs, useCached, resources, }: InstallSnapshotOptions): Promise<{
    installPath: string;
    disableEsTmpDir: boolean;
}>;
