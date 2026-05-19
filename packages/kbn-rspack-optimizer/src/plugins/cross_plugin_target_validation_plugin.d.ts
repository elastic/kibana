import type { Compiler } from '@rspack/core';
import type { PluginEntry } from '../types';
/**
 * Dist-only validation plugin that detects undeclared cross-plugin import
 * targets within the browser compilation graph. Uses the same
 * `normalModuleFactory` hook pattern as the legacy `BundleRemotesPlugin`.
 *
 * In the single compile, all in-repo cross-plugin imports resolve via normal
 * module resolution, so they succeed even without `extraPublicDirs`
 * registration. This means transitive chains like:
 *
 *   public/foo.ts -> (same plugin) common/bar.ts -> @kbn/other-plugin/common/x
 *
 * silently work in-repo but break for external plugins (which rely on
 * `__kbnBundles__`). This plugin surfaces those undeclared targets as
 * errors during dist builds so developers can fix them before shipping.
 *
 * @see packages/kbn-optimizer/src/worker/bundle_remotes_plugin.ts (legacy)
 * @see packages/kbn-rspack-optimizer/src/config/create_external_plugin_config.ts (external)
 */
export declare class CrossPluginTargetValidationPlugin {
    private pluginTargets;
    private pluginContextDirs;
    private violations;
    constructor(plugins: PluginEntry[]);
    private getOwnerPkgId;
    apply(compiler: Compiler): void;
}
