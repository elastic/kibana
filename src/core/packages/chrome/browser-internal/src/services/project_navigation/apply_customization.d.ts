import type { CloudLinks, ChromeNavLink, ChromeProjectNavigationNode, NavigationCustomization, NavigationTreeDefinition, NavigationTreeDefinitionUI, SolutionId } from '@kbn/core-chrome-browser';
export interface ParsedNavigation {
    id: SolutionId;
    tree: ChromeProjectNavigationNode[];
    treeUI: NavigationTreeDefinitionUI;
    flattened: Record<string, ChromeProjectNavigationNode>;
    overflowItemIds: string[];
    defaultItemIds: string[];
    /**
     * Top-level body nodes the sidebar will actually render: hidden nodes removed
     * and panel-openers with no visible descendants pruned. The home node is
     * excluded unless `isHomeCustomizable` is set, in which case it is kept as a
     * regular customizable item.
     */
    renderableNodes: ChromeProjectNavigationNode[];
}
/**
 * Applies user customization (moves + hidden) to a raw navigation tree definition,
 * parses the result, and returns the enriched {@link ParsedNavigation} structure.
 *
 * Moves are replayed sequentially on the default body order. Moves whose `id` or
 * `afterId` no longer exist in the current tree are silently skipped, making the
 * logic resilient to navigation items being added or removed across releases.
 *
 * `defaultItemIds` is captured from the *original* body (before any moves) so
 * callers can always determine which items ship with the solution by default.
 *
 * When `isHomeCustomizable` is true the `renderAs: 'home'` node is treated as a
 * regular, customizable item: it is kept in `defaultItemIds`/`renderableNodes`
 * and normalized to the shared "Home" title and icon so the customize modal and
 * the rendered sidebar present it identically. When false (classic chrome) the
 * home node is excluded from customization and left for the render layer to
 * extract as the solution logo.
 */
export declare const applyCustomization: (solutionId: SolutionId, def: NavigationTreeDefinition, deepLinks: Record<string, ChromeNavLink>, cloudLinks: CloudLinks, customization: NavigationCustomization | undefined, isHomeCustomizable?: boolean) => ParsedNavigation;
