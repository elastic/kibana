/**
 * Exported so callers that render edges can apply the same threshold for
 * deciding whether to draw a straight line vs. a routed polyline.
 * (workflow_graph_edge.tsx uses an identical constant — importing from here
 * keeps the two in sync without a manual "keep in sync" comment.)
 */
export declare const STRAIGHT_X_THRESHOLD = 100;
/** When barycenter moves endpoints by unequal cross-axis deltas, Dagre waypoints are stale. */
export declare const CROSS_AXIS_DELTA_TOLERANCE = 1;
export declare const DEFAULT_COMPOUND_PADDING: {
    readonly top: 0;
    readonly right: 0;
    readonly bottom: 0;
    readonly left: 0;
};
