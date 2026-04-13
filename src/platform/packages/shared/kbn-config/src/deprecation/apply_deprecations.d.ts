import type { AddConfigDeprecation, ChangedDeprecatedPaths, ConfigDeprecationWithContext } from './types';
/**
 * Applies deprecations on given configuration and passes addDeprecation hook.
 * This hook is used for logging any deprecation warning using provided logger.
 * This hook is used for exposing deprecated configs that must be handled by the user before upgrading to next major.
 *
 * @internal
 */
export declare const applyDeprecations: (config: Record<string, any>, deprecations: ConfigDeprecationWithContext[], createAddDeprecation?: (pluginId: string) => AddConfigDeprecation) => {
    config: Record<string, any>;
    changedPaths: ChangedDeprecatedPaths;
};
