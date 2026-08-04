import type { Row } from '@tanstack/react-table';
import type { GroupNode, LeafNode } from '../store_provider';
/**
 * @description This function determines if the provided row is a group node or a leaf node.
 */
export declare function isCascadeGroupRowNode<G extends GroupNode, L extends LeafNode>(currentGroupByColumns: string[], row: Row<G>): boolean;
/**
 * @description This function returns the path of the row node in the group by hierarchy.
 */
export declare function getCascadeRowNodePath<G extends GroupNode, L extends LeafNode>(currentGroupByColumns: string[], row: Row<G>): string[];
/**
 * @description This function returns a record of the path values for the provided row node.
 */
export declare function getCascadeRowNodePathValueRecord<G extends GroupNode, L extends LeafNode>(currentGroupByColumns: string[], row: Row<G>): {
    [x: string]: any;
};
/**
 * @description This function generates a cache key to persist and retrieve the leaf data of a cascade row.
 */
export declare function getCascadeRowLeafDataCacheKey(nodePath: string[], nodePathMap: Record<string, string>, leafId: string): string;
/**
 * Returns the leaf ID from a leaf cache key.
 */
export declare function getLeafIdFromCacheKey(cacheKey: string): string;
