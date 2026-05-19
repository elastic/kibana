import { type Compiler } from '@rspack/core';
import type { SingleCompileConfigOptions } from '../config/create_single_compile_config';
/**
 * RSPack plugin that watches for plugin changes (kibana.jsonc files)
 * and triggers a rebuild when plugins are added or removed.
 */
export declare class PluginWatchPlugin {
    private pluginManifests;
    private options;
    private wrapperDir;
    private lastPluginHash;
    private hasInitialDiscovery;
    constructor(pluginManifests: string[], options: SingleCompileConfigOptions, wrapperDir: string);
    private shouldRediscoverPlugins;
    apply(compiler: Compiler): void;
}
