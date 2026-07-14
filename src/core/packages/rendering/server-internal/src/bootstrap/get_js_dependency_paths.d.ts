import type { PluginInfo } from './get_plugin_bundle_paths';
export declare const getJsDependencyPaths: (regularBundlePath: string, bundlePaths: Map<string, PluginInfo>) => string[];
/**
 * Get JS dependency paths for RSPack unified compilation mode.
 *
 * Load order:
 * 1. Webpack shared deps (kbn-ui-shared-deps) — npm externals (React, lodash, etc.)
 * 2. Rspack async chunks (shared + plugin entries) — JSONP modules queue into
 *    `globalThis.webpackChunkkibana_bundle` before the runtime loads
 * 3. kibana.bundle.js (LAST) — Rspack runtime drains the JSONP queue, then
 *    dynamic imports resolve instantly without network requests
 * 4. External plugin bundles (if any) — register with __kbnBundles__ on load
 */
export declare const getRspackDependencyPaths: (regularBundlePath: string, _bundlePaths: Map<string, PluginInfo>, externalPluginPaths?: string[], chunkPaths?: string[]) => string[];
