/**
 * Get JS dependency paths for the unified Rspack compilation.
 *
 * Load order:
 * 1. Webpack shared deps (kbn-ui-shared-deps) — npm externals (React, lodash, etc.)
 * 2. Rspack async chunks (shared + plugin entries) — JSONP modules queue into
 *    `globalThis.rspackChunkkibana_bundle` (Rspack v2 default) before the runtime loads
 * 3. kibana.bundle.js (LAST) — Rspack runtime drains the JSONP queue, then
 *    dynamic imports resolve instantly without network requests
 * 4. External plugin bundles (if any) — register with __kbnBundles__ on load
 */
export declare const getRspackDependencyPaths: (regularBundlePath: string, externalPluginPaths?: string[], chunkPaths?: string[]) => string[];
