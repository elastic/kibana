import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
/**
 * Predicate to check if a nodePath is active
 *
 * @param nodePath The path of the node to check
 * @param activeNodes The active nodes to check against
 * @param onlyIfHighestMatch Flag to indicate if we should only return true if the nodePath is the highest match
 * @returns Boolean indicating if the nodePath is active
 */
export declare function isActiveFromUrl(nodePath: string, activeNodes: ChromeProjectNavigationNode[][], onlyIfHighestMatch?: boolean): boolean;
