import type { graphlib } from '@dagrejs/dagre';
export type CrossAxis = 'x' | 'y';
/**
 * Re-centre a Dagre-laid-out graph on the rank cross-axis so parents sit at the
 * barycenter of their children (and merge nodes at the barycenter of parents).
 * TB layouts pass crossAxis `'x'`; LR layouts pass `'y'`.
 */
export declare const alignDagreCrossAxisInPlace: (g: graphlib.Graph, crossAxis: CrossAxis, nodeSep: number) => void;
/**
 * Restore dagre's non-overlap guarantee after the barycenter pass. The barycenter
 * recentring only edits the cross axis and can pull a wide subtree's head across
 * its rank until it overlaps a sibling; it never changes the main-axis (rank)
 * coordinate, so grouping by main-axis centre and separating within each rank on
 * the cross axis is sufficient. No-op when nothing overlaps.
 */
export declare const separateRankOverlapsInPlace: (g: graphlib.Graph, crossAxis: CrossAxis, nodeSep: number) => void;
export declare const snapshotDagreNodeCenters: (g: graphlib.Graph, nodeIds: string[]) => Map<string, {
    x: number;
    y: number;
}>;
export declare const shiftEdgePointsOnCrossAxis: (points: Array<{
    x: number;
    y: number;
}>, crossAxis: CrossAxis, delta: number) => Array<{
    x: number;
    y: number;
}>;
export interface ShiftEdgePointsInterpolatedParams {
    points: Array<{
        x: number;
        y: number;
    }>;
    crossAxis: CrossAxis;
    mainAxis: CrossAxis;
    sourceMain: number;
    targetMain: number;
    sourceDelta: number;
    targetDelta: number;
}
/**
 * Shifts each waypoint's cross-axis coordinate by an amount interpolated between
 * sourceDelta and targetDelta along the edge's main axis (Y for TB, X for LR).
 */
export declare const shiftEdgePointsInterpolated: ({ points, crossAxis, mainAxis, sourceMain, targetMain, sourceDelta, targetDelta, }: ShiftEdgePointsInterpolatedParams) => Array<{
    x: number;
    y: number;
}>;
export declare const translateEdgePoints: (points: ReadonlyArray<{
    x: number;
    y: number;
}>, dx: number, dy: number) => Array<{
    x: number;
    y: number;
}>;
