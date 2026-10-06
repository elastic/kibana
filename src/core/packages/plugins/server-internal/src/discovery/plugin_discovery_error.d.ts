/** @internal */
export declare enum PluginDiscoveryErrorType {
    IncompatibleVersion = "incompatible-version",
    InvalidSearchPath = "invalid-search-path",
    InvalidPluginPath = "invalid-plugin-path",
    InvalidManifest = "invalid-manifest",
    MissingManifest = "missing-manifest"
}
/** @internal */
export declare class PluginDiscoveryError extends Error {
    readonly type: PluginDiscoveryErrorType;
    readonly path: string;
    readonly cause: Error;
    static incompatibleVersion(path: string, cause: Error): PluginDiscoveryError;
    static invalidSearchPath(path: string, cause: Error): PluginDiscoveryError;
    static invalidPluginPath(path: string, cause: Error): PluginDiscoveryError;
    static invalidManifest(path: string, cause: Error): PluginDiscoveryError;
    static missingManifest(path: string, cause: Error): PluginDiscoveryError;
    /**
     * @param type Type of the discovery error (invalid directory, invalid manifest etc.)
     * @param path Path at which discovery error occurred.
     * @param cause "Raw" error object that caused discovery error.
     */
    constructor(type: PluginDiscoveryErrorType, path: string, cause: Error);
}
