import type { Document, Node, Pair } from 'yaml';
/**
 * Builds a path array from YAML visitor ancestors.
 *
 * @param ancestors - Array of ancestor nodes from the YAML visitor
 * @param targetNode - Optional target node for special handling of sequences
 * @returns Array representing the path to the node (e.g., ['steps', 0, 'type'])
 */
export declare function getPathFromAncestors(ancestors: readonly (Node | Document<Node, true> | Pair<unknown, unknown>)[], targetNode?: Node): Array<string | number>;
