import type { Package } from '@kbn/repo-packages';
import type { PackageInfo, EnvironmentMode } from './types';
/** @internal */
export interface EnvOptions {
    configs: string[];
    cliArgs: CliArgs;
    repoPackages?: readonly Package[];
}
/** @internal */
export interface CliArgs {
    dev: boolean;
    envName?: string;
    silent?: boolean;
    verbose?: boolean;
    watch: boolean;
    basePath: boolean;
    oss: boolean;
    /** @deprecated use disableOptimizer to know if the @kbn/optimizer is disabled in development */
    optimize?: boolean;
    runExamples: boolean;
    disableOptimizer: boolean;
    cache: boolean;
    dist: boolean;
    serverless?: boolean;
    uiam?: boolean;
    retrictInternalApis?: boolean;
}
/** @internal */
export interface RawPackageInfo {
    branch: string;
    version: string;
    build: {
        distributable?: boolean;
        number: number;
        sha: string;
        date: string;
    };
}
export declare class Env {
    readonly homeDir: string;
    /**
     * @internal
     */
    static createDefault(repoRoot: string, options: EnvOptions, pkg?: RawPackageInfo): Env;
    /** @internal */
    readonly configDir: string;
    /** @internal */
    readonly binDir: string;
    /** @internal */
    readonly logDir: string;
    /** @internal */
    readonly pluginSearchPaths: readonly string[];
    /** @internal */
    readonly repoPackages?: readonly Package[];
    /**
     * Information about Kibana package (version, build number etc.).
     */
    readonly packageInfo: Readonly<PackageInfo>;
    /**
     * Mode Kibana currently run in (development or production).
     */
    readonly mode: Readonly<EnvironmentMode>;
    /**
     * Arguments provided through command line.
     * @internal
     */
    readonly cliArgs: Readonly<CliArgs>;
    /**
     * Paths to the configuration files.
     * @internal
     */
    readonly configs: readonly string[];
    /**
     * @internal
     */
    constructor(homeDir: string, pkg: RawPackageInfo, options: EnvOptions);
}
