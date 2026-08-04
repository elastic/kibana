import { type CrossAxis } from './align_cross_axis';
import type { DagEdge, DagLayoutDirection, DagNode, DagPositionedEdge, DagPositionedNode } from './types';
/** Drops Dagre waypoints when endpoints align but middle segments still spread laterally. */
export declare const resolveShiftedEdgePoints: ({ shifted, sourceCenter, targetCenter, crossAxis, }: {
    shifted: Array<{
        x: number;
        y: number;
    }>;
    sourceCenter: number;
    targetCenter: number;
    crossAxis: CrossAxis;
}) => Array<{
    x: number;
    y: number;
}>;
export declare function applyDagre(nodes: readonly DagNode[], edges: readonly DagEdge[], direction: DagLayoutDirection, nodeSep: number, rankSep: number): {
    nodes: DagPositionedNode[];
    edges: DagPositionedEdge[];
};
