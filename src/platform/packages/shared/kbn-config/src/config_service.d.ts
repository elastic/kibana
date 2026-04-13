import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Type } from '@kbn/config-schema';
import type { Observable } from 'rxjs';
import type { LoggerFactory } from '@kbn/logging';
import type { Config, ConfigPath, Env } from '..';
import type { RawConfigurationProvider } from './raw';
import type { ConfigDeprecationProvider, DeprecatedConfigDetails, ChangedDeprecatedPaths } from './deprecation';
/** @internal */
export type IConfigService = PublicMethodsOf<ConfigService>;
/** @internal */
export interface ConfigValidateParameters {
    /**
     * Indicates whether config deprecations should be logged during validation.
     */
    logDeprecations: boolean;
}
/** @internal */
export declare class ConfigService {
    private readonly rawConfigProvider;
    private readonly env;
    private readonly log;
    private readonly deprecationLog;
    private readonly docLinks;
    private stripUnknownKeys;
    private validated;
    private readonly config$;
    private lastConfig?;
    private readonly deprecatedConfigPaths;
    /**
     * Whenever a config if read at a path, we mark that path as 'handled'. We can
     * then list all unhandled config paths when the startup process is completed.
     */
    private readonly handledPaths;
    private readonly schemas;
    private readonly deprecations;
    private readonly dynamicPaths;
    private readonly overrides$;
    private readonly handledDeprecatedConfigs;
    constructor(rawConfigProvider: RawConfigurationProvider, env: Env, logger: LoggerFactory);
    /**
     * Set the global setting for stripUnknownKeys. Useful for running in Serverless-compatible way.
     * @param stripUnknownKeys Set to `true` if unknown keys (not explicitly forbidden) should be dropped without failing validation
     */
    setGlobalStripUnknownKeys(stripUnknownKeys: boolean): void;
    /**
     * Set config schema for a path and performs its validation
     */
    setSchema(path: ConfigPath, schema: Type<unknown>): void;
    /**
     * Register a {@link ConfigDeprecationProvider} to be used when validating and migrating the configuration
     */
    addDeprecationProvider(path: ConfigPath, provider: ConfigDeprecationProvider): void;
    /**
     * returns all handled deprecated configs
     */
    getHandledDeprecatedConfigs(): [string, DeprecatedConfigDetails[]][];
    /**
     * Validate the whole configuration and log the deprecation warnings.
     *
     * This must be done after every schemas and deprecation providers have been registered.
     */
    validate(params?: ConfigValidateParameters): Promise<void>;
    /**
     * Returns the full config object observable. This is not intended for
     * "normal use", but for internal features that _need_ access to the full object.
     */
    getConfig$(): Observable<Config>;
    /**
     * Reads the subset of the config at the specified `path` and validates it
     * against its registered schema.
     *
     * @param path - The path to the desired subset of the config.
     * @param ignoreUnchanged - If true (default), will not emit if the config at path did not change.
     */
    atPath<TSchema>(path: ConfigPath, { ignoreUnchanged }?: {
        ignoreUnchanged?: boolean;
    }): Observable<TSchema>;
    /**
     * Similar to {@link atPath}, but return the last emitted value synchronously instead of an
     * observable.
     *
     * @param path - The path to the desired subset of the config.
     */
    atPathSync<TSchema>(path: ConfigPath): TSchema;
    isEnabledAtPath(path: ConfigPath): Promise<boolean>;
    getUnusedPaths(): Promise<string[]>;
    getUsedPaths(): Promise<string[]>;
    getDeprecatedConfigPath$(): Observable<ChangedDeprecatedPaths>;
    /**
     * Adds a specific setting to be allowed to change dynamically.
     * @param configPath The namespace of the config
     * @param dynamicConfigPaths The config keys that can be dynamically changed
     */
    addDynamicConfigPaths(configPath: ConfigPath, dynamicConfigPaths: string[]): void;
    /**
     * Used for dynamically extending the overrides.
     * These overrides are not persisted and will be discarded after restarts.
     * @param newOverrides
     */
    setDynamicConfigOverrides(newOverrides: Record<string, unknown>): Record<string, unknown>;
    listAllSettings(): Array<{
        setting: string;
        type: string;
    }>;
    private logDeprecation;
    private validateAtPath;
    private getValidatedConfigAtPath$;
    private markAsHandled;
    private markDeprecatedConfigAsHandled;
    private createDeprecationContext;
}
