import type { InstallSourceOptions } from './types';
/**
 * Installs ES from source
 */
export declare function installSource({ license, password, sourcePath, basePath, installPath, log, esArgs, resources, }: InstallSourceOptions): Promise<{
    installPath: string;
    disableEsTmpDir: boolean;
}>;
