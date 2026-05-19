import type { ChromeNavLink, ChromeProjectNavigationNode, NavigationTreeDefinition, NavigationTreeDefinitionUI, CloudLinks, SolutionId } from '@kbn/core-chrome-browser/src';
import type { Location } from 'history';
/**
 * Flatten the navigation tree into a record of path => node
 * for quicker access when detecting the active path
 *
 * @param navTree The navigation tree to flatten
 * @param prefix Array of path prefix (used in the recursion)
 * @returns The flattened navigation tree
 */
export declare const flattenNav: (navTree: ChromeProjectNavigationNode[], prefix?: string[], acc?: Record<string, ChromeProjectNavigationNode>) => Record<string, ChromeProjectNavigationNode>;
export declare const stripQueryParams: (url: string) => string;
/**
 * Find the active nodes in the navigation tree based on the current Location.pathname
 * Note that the pathname cand match multiple navigation tree branches, each branch
 * will be returned as an array of nodes.
 *
 * @param currentPathname The current Location.pathname
 * @param navTree The flattened navigation tree
 * @returns The active nodes
 */
export declare const findActiveNodes: (currentPathname: string, navTree: Record<string, ChromeProjectNavigationNode>, location?: Location, prepend?: (path: string) => string) => ChromeProjectNavigationNode[][];
export declare const parseNavigationTree: (id: SolutionId, navigationTreeDef: NavigationTreeDefinition, { deepLinks, cloudLinks, }: {
    deepLinks: Record<string, ChromeNavLink>;
    cloudLinks: CloudLinks;
}) => {
    navigationTree: ChromeProjectNavigationNode[];
    navigationTreeUI: NavigationTreeDefinitionUI;
};
