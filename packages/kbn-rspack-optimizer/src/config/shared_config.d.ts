import { type RuleSetRule, type Configuration, type RspackPluginInstance } from '@rspack/core';
import type { ThemeTag } from '../types';
/**
 * Shared resolve configuration for all RSPack builds.
 * Used by both main Kibana build and external plugins.
 */
export declare function getSharedResolveConfig(repoRoot: string): Configuration['resolve'];
/**
 * Shared resolve.fallback for Node.js built-ins.
 * These modules don't exist in browser and should be empty/false.
 */
export declare function getSharedResolveFallback(): Record<string, false>;
export declare function getSwcLoaderRules(dist: boolean, hmr?: boolean): RuleSetRule[];
/**
 * Get the Babel loader configuration (fallback for compatibility).
 * Used when SWC is not available or has issues.
 * @deprecated Prefer getSwcLoaderRules() for better performance
 */
export declare function getBabelLoaderRule(dist: boolean): RuleSetRule;
/**
 * Get CSS loader rule for all CSS files.
 * Uses style-loader + css-loader for maximum compatibility with
 * node_modules packages like @xyflow/react, react-diff-viewer, etc.
 *
 * Note: We explicitly set type: 'javascript/auto' to tell RSPack to use
 * the loader chain instead of trying to use native CSS parsing.
 */
export declare function getCssLoaderRule(dist: boolean): RuleSetRule;
/**
 * Get SCSS loader rule with compile-time theme support.
 *
 * This generates a `oneOf` rule set that:
 * 1. For each theme, matches `*.scss?{theme}` and compiles with that theme's globals
 * 2. For plain `*.scss` imports, uses the theme_loader to generate a runtime switch
 *
 * At runtime, `window.__kbnThemeTag__` determines which compiled stylesheet to use.
 */
export declare function getScssLoaderRule(repoRoot: string, dist: boolean, themeTags?: ThemeTag[], bundleId?: string): RuleSetRule;
/**
 * Get SCSS loader rule for node_modules (no theme switching).
 * Node modules SCSS is compiled with light theme globals only.
 */
export declare function getNodeModulesScssLoaderRule(repoRoot: string, dist: boolean): RuleSetRule;
/**
 * Get image asset loader rule.
 */
export declare function getImageLoaderRule(): RuleSetRule;
/**
 * Get font asset loader rule.
 */
export declare function getFontLoaderRule(): RuleSetRule;
/**
 * Get text/raw file loader rule.
 */
export declare function getTextLoaderRule(): RuleSetRule;
/**
 * Get raw query loader rule (?raw imports).
 */
export declare function getRawQueryLoaderRule(): RuleSetRule;
/**
 * Get peggy grammar loader rule.
 * Uses @kbn/peggy-loader to compile .peggy grammars to JavaScript parsers.
 */
export declare function getPeggyLoaderRule(): RuleSetRule;
/**
 * Get all shared module rules.
 * These rules are used by both main build and external plugins.
 *
 * @param repoRoot - Root of the Kibana repository
 * @param dist - Whether this is a production build
 * @param themeTags - Theme tags to generate (default: light and dark)
 * @param bundleId - Bundle ID for theme loader
 * @param useBabel - Use Babel instead of SWC (default: false)
 */
export declare function getSharedModuleRules(repoRoot: string, dist: boolean, themeTags?: ThemeTag[], bundleId?: string, useBabel?: boolean, hmr?: boolean): RuleSetRule[];
/**
 * Shared warnings to ignore.
 * These are known warnings that don't affect functionality.
 */
export declare function getSharedIgnoreWarnings(): RegExp[];
/**
 * Compute a short hash of the given config files for cache versioning.
 * Used by both the main and external plugin configs to ensure cache
 * invalidation when config changes, since RSPack's buildDependencies
 * may not work correctly with TypeScript files.
 */
export declare function computeConfigHash(repoRoot: string, files: readonly string[]): string;
/**
 * Shared SWC minimizer configuration for production builds.
 * Targets ES2020 (safe based on .browserslistrc / Firefox ESR 115+).
 */
export declare function getMinimizer(dist: boolean): RspackPluginInstance[];
