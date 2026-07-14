/**
 * Minimal structural subset of ChromeProjectNavigationNode.
 * Using a local interface instead of importing from @kbn/core-chrome-browser
 * keeps this package dependency-free, preventing a kbn_references cycle.
 */
interface NavigationNode {
    id: string;
    icon?: unknown;
    deepLink?: {
        euiIconType?: string;
        icon?: string;
    };
}
/** @internal */
export declare const NAVIGATION_NODE_ICON_FALLBACK: "broom";
/**
 * Resolves the EUI icon type for a project navigation node using the same
 * fallback chain as the side navigation renderer.
 *
 * Shared by `@kbn/core-chrome-browser-components` (via re-export from
 * `@kbn/core-chrome-browser`) and the navigation customization modal
 * (via dynamic import).
 */
export declare const getNavigationNodeIcon: (node: NavigationNode | null) => string;
export {};
