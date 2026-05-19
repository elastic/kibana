import type { ToolingLog } from '@kbn/tooling-log';
import type { ArtifactLicense } from '../artifact';
export interface InstallSourceOptions {
    sourcePath: string;
    license?: ArtifactLicense;
    password?: string;
    basePath?: string;
    installPath?: string;
    log?: ToolingLog;
    esArgs?: string[];
    resources?: string[];
}
export interface DownloadSnapshotOptions {
    version: string;
    license?: ArtifactLicense;
    basePath?: string;
    installPath?: string;
    log?: ToolingLog;
    useCached?: boolean;
    resources?: string[];
}
export interface InstallSnapshotOptions extends DownloadSnapshotOptions {
    password?: string;
    esArgs?: string[];
}
export interface InstallArchiveOptions {
    license?: ArtifactLicense;
    password?: string;
    basePath?: string;
    installPath?: string;
    log?: ToolingLog;
    esArgs?: string[];
    /** Disable creating a temp directory, allowing ES to write to OS's /tmp directory */
    disableEsTmpDir?: boolean;
    resources?: string[];
}
