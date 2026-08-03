import type { DagCompoundGroup, DagEdge, DagLayoutOptions, DagNode, DagPositionedEdge, DagPositionedNode } from './types';
/**
 * @returns Positioned nodes and edges with absolute coordinates.
 * In compact mode (`options.compact === true`), inner nodes of compound groups
 * are excluded from the returned `nodes` array.
 * @throws If the input graph contains a cycle.
 */
export declare function dagLayout(nodes: readonly DagNode[], edges: readonly DagEdge[], compoundGroups?: readonly DagCompoundGroup[], options?: DagLayoutOptions): {
    nodes: DagPositionedNode[];
    edges: DagPositionedEdge[];
};
