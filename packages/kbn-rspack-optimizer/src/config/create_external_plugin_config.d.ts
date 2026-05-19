import { type Configuration } from '@rspack/core';
import type { ThemeTag } from '../types';
export interface ExternalPluginConfigOptions {
    /** Path to the Kibana repository root */
    repoRoot: string;
    /** Path to the plugin source directory */
    pluginDir: string;
    /** Plugin ID from kibana.json */
    pluginId: string;
    /** Output directory for the built bundle */
    outputDir: string;
    /** Build for production (minified) */
    dist?: boolean;
    /** Watch mode */
    watch?: boolean;
    /** Enable caching */
    cache?: boolean;
    /** Theme tags to compile (default: borealislight, borealisdark) */
    themeTags?: ThemeTag[];
}
/**
 * Create an RSPack configuration for building an EXTERNAL/third-party plugin.
 *
 * This config shares most of its configuration with the main Kibana build
 * (via shared_config.ts) to ensure consistency. The differences are:
 *
 * 1. Single plugin entry instead of unified entry
 * 2. Externalizes cross-plugin imports to __kbnBundles__.get()
 * 3. Output goes to a separate directory
 *
 * The output bundle can be loaded after kibana.bundle.js and will integrate
 * seamlessly with the Kibana plugin system.
 */
export declare function createExternalPluginConfig(options: ExternalPluginConfigOptions): Promise<Configuration>;
/**
 * Create callback-style externals function for cross-plugin imports.
 *
 * External plugins must use `__kbnBundles__.get()` to access other plugins
 * since they're not bundled together like the main build. This function
 * validates imports against the declared targets of each in-repo plugin,
 * replicating the error semantics of the legacy `BundleRemotesPlugin`:
 *
 * - If an import targets a directory not declared in `extraPublicDirs`,
 *   the build fails with an explicit error message.
 * - If the import targets a declared directory, it's externalized to a
 *   `__kbnBundles__.get('plugin/{id}/{target}')` call.
 * - `@kbn/core/public` is handled as a special case.
 *
 * We use callback-style externals (rather than return-style) because
 * rspack's callback API lets us report build errors via `callback(new Error(...))`,
 * matching the legacy plugin's error-on-invalid-target behavior.
 *
 * The `convertPkgIdToPluginId` heuristic (error-prone kebab-to-camel conversion)
 * is replaced by the authoritative `pluginId` from the discovered manifest data.
 *
 * @see packages/kbn-optimizer/src/worker/bundle_remotes_plugin.ts (legacy equivalent)
 */
export declare function createCrossPluginExternals(pluginTargets: Map<string, {
    pluginId: string;
    targets: string[];
}>): ({ request }: {
    request?: string;
}, callback: (err?: Error, result?: string) => void) => void;
/**
 * Create a wrapper entry module that:
 * 1. Imports each target entry of the plugin
 * 2. Registers all targets with `__kbnBundles__`
 *
 * The legacy optimizer registered every target in `['public', ...extraPublicDirs]`
 * with `__kbnBundles__.define()`. This ensures external plugins' extra targets
 * are also available at runtime via `__kbnBundles__.get('plugin/{id}/{target}')`.
 *
 * @param targets - The plugin's resolved targets (['public', ...extraPublicDirs])
 */
export declare function createPluginWrapper(wrapperDir: string, pluginId: string, pluginDir: string, targets: string[]): string;
