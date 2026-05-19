/**
 * Get externals mapping for shared dependencies.
 *
 * Spreads the canonical externals from @kbn/ui-shared-deps-src (the single
 * source of truth shared with the legacy webpack optimizer) so that any
 * addition there is automatically picked up here.
 */
export declare function getExternals(): Record<string, string>;
