export interface EsClusterExecOptions {
    skipSecuritySetup?: boolean;
    reportTime?: (...args: any[]) => void;
    startTime?: number;
    esArgs?: string[] | string;
    esJavaOpts?: string;
    password?: string;
    skipReadyCheck?: boolean;
    readyTimeout?: number;
    onEarlyExit?: (msg: string) => void;
    writeLogsToPath?: string;
    /**
     * Controls how much of Elasticsearch stdout is forwarded to the `ToolingLog`.
     *
     * Defaults to `'warn'`. When `writeLogsToPath` is set, stdout/stderr are written
     * to that file and not forwarded to the `ToolingLog`, regardless of this setting.
     */
    esStdoutLogLevel?: 'all' | 'info' | 'warn' | 'error' | 'silent';
    /** Disable creating a temp directory, allowing ES to write to OS's /tmp directory */
    disableEsTmpDir?: boolean;
}
