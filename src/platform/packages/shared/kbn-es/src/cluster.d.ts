import type { ToolingLog } from '@kbn/tooling-log';
import type { DockerOptions, ServerlessOptions } from './utils';
import type { EsClusterExecOptions } from './cluster_exec_options';
import type { DownloadSnapshotOptions, InstallArchiveOptions, InstallSnapshotOptions, InstallSourceOptions } from './install/types';
export declare class Cluster {
    private log;
    private ssl;
    private stopCalled;
    private process;
    private outcome;
    private serverlessNodes;
    private dockerContainerName;
    private setupPromise;
    private stdioTarget;
    constructor({ log, ssl }?: {
        log?: ToolingLog | undefined;
        ssl?: boolean | undefined;
    });
    /**
     * Builds and installs ES from source
     */
    installSource(options: InstallSourceOptions): Promise<{
        installPath: string;
        disableEsTmpDir: boolean;
    }>;
    /**
     * Download ES from a snapshot
     */
    downloadSnapshot(options: DownloadSnapshotOptions): Promise<{
        downloadPath: string;
    }>;
    /**
     * Download and installs ES from a snapshot
     */
    installSnapshot(options: InstallSnapshotOptions): Promise<{
        installPath: string;
        disableEsTmpDir: boolean;
    }>;
    /**
     * Installs ES from a local tar
     */
    installArchive(archivePath: string, options?: InstallArchiveOptions): Promise<{
        installPath: string;
        disableEsTmpDir: boolean;
    }>;
    /**
     * Unpacks a tar or zip file containing the data directory for an ES cluster.
     */
    extractDataDirectory(installPath: string, archivePath: string, extractDirName?: string): Promise<void>;
    /**
     * Installs comma separated list of ES plugins to the specified path
     */
    installPlugins(installPath: string, plugins: string, esJavaOpts?: string): Promise<void>;
    configureKeystoreWithSecureSettingsFiles(installPath: string, secureSettingsFiles: string[][]): Promise<void>;
    /**
     * Starts ES and returns resolved promise once started
     */
    start(installPath: string, options: EsClusterExecOptions): Promise<void>;
    /**
     * Starts Elasticsearch and waits for Elasticsearch to exit
     */
    run(installPath: string, options: EsClusterExecOptions): Promise<void>;
    /**
     * Stops cluster
     */
    private stopCluster;
    /**
     * Stops ES process, if it's running
     */
    stop(): Promise<void>;
    /**
     * Stops ES process without waiting for it to shutdown gracefully
     */
    kill(): Promise<void>;
    /**
     * Common logic from this.start() and this.run()
     *
     * Start the Elasticsearch process (stored at `this.process`)
     * and "pipe" its stdio to `this.log`. Also create `this.outcome`
     * which will be resolved/rejected when the process exits.
     */
    private exec;
    private getJavaOptions;
    /**
     * Runs an Elasticsearch Serverless Docker cluster and returns node names
     */
    runServerless(options: ServerlessOptions): Promise<string[]>;
    /**
     * Run an Elasticsearch Docker container.
     * Pass `snapshot: true` to activate snapshot-equivalent semantics
     * (security, readiness check, detached mode, native realm setup).
     */
    runDocker(options: DockerOptions): Promise<void>;
}
