import type { InstallArchiveOptions } from './types';
/**
 * Extracts an ES archive and optionally installs plugins
 */
export declare function installArchive(archive: string, options?: InstallArchiveOptions): Promise<{
    installPath: string;
    disableEsTmpDir: boolean;
}>;
