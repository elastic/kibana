import { Position } from '@xyflow/react';
import type { EdgeBranchType } from '@kbn/workflows';
export interface ComputeEdgePathInput {
    readonly sourceX: number;
    readonly sourceY: number;
    readonly targetX: number;
    readonly targetY: number;
    readonly sourcePosition: Position;
    readonly targetPosition: Position;
    readonly points?: ReadonlyArray<{
        readonly x: number;
        readonly y: number;
    }>;
    readonly branchType?: EdgeBranchType;
    readonly isMerge?: boolean;
}
/**
 * Build an orthogonal SVG path through the given waypoints with rounded
 * corners (radius `r`) at each interior vertex. Falls back to straight
 * line segments when there isn't enough room for the curve.
 *
 * Exported for unit testing.
 */
export declare function buildRoundedOrthogonalPath(inputPoints: Array<{
    x: number;
    y: number;
}>, r: number): {
    path: string;
    labelX: number;
    labelY: number;
};
/**
 * Build the SVG path for a fork-edge single-bus routing. All branch edges of
 * one fork node (switch case/default, if-then, if-else) share the same
 * sourceX/sourceY, so their trunks and bus line (busY or busX) are identical —
 * they naturally overlay into one visible trunk + one bus. Labels sit at a
 * fixed offset below/right of the bus so all branch labels align on one row
 * (TB) / one column (LR) regardless of how deep each branch target sits.
 *
 * TB shape: source → trunk down → bus horizontal → drop vertical → target.
 * LR shape: source → trunk right → bus vertical → drop horizontal → target.
 *
 * Exported for unit testing.
 */
export declare function buildForkBusPath(p: {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
}, isLR: boolean, trunk: number): {
    path: string;
    labelX: number;
    labelY: number;
};
/**
 * Build the SVG path for a merge-edge single-bus routing. The inverse of
 * `buildForkBusPath`: all fan-in edges sharing the same target meet at a shared
 * horizontal bus just above the target (TB) or a vertical bus just left of the
 * target (LR), then one shared trunk descends / advances into the target.
 * Because all edges share targetX/targetY, their buses and trunks overlap into
 * one visible bus + one trunk, exactly mirroring the fork bus.
 *
 * TB shape: source → drop vertical to busY → bus horizontal to targetX → trunk down to target.
 * LR shape: source → drop horizontal to busX → bus vertical to targetY → trunk right to target.
 *
 * Exported for unit testing.
 */
export declare function buildMergeBusPath(p: {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
}, isLR: boolean, trunk: number): {
    path: string;
    labelX: number;
    labelY: number;
};
/**
 * Pure SVG-path computation for a workflow graph edge. Contains all routing
 * decisions (fork-bus, merge-bus, dagre-waypoint trunk-stub, smooth-step
 * fallback). Returns `{ path, labelX, labelY }` with no React/DOM dependency.
 */
export declare const computeEdgePath: ({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, points: dagrePoints, branchType, isMerge, }: ComputeEdgePathInput) => {
    path: string;
    labelX: number;
    labelY: number;
};
