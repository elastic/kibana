import type { DagPositionedEdge, DagPositionedNode } from '@kbn/dag-layout';
import type { LayoutDirection, TransformResult } from '@kbn/workflows';
export declare const WORKFLOW_COMPOUND_PADDING: {
    readonly top: 70;
    readonly right: 32;
    readonly bottom: 32;
    readonly left: 32;
};
export declare const WORKFLOW_NODE_SEP = 50;
export declare const WORKFLOW_RANK_SEP = 70;
export interface LayoutSnapshot {
    nodes: DagPositionedNode[];
    edges: DagPositionedEdge[];
}
/**
 * Pure data pipeline: TransformResult → dagLayout → positioned nodes + edges.
 *
 * Maps domain nodes/edges/groups to the @kbn/dag-layout format, runs the
 * layout engine, and derives `triggerNodeIds` / `leafNodeIds` from the domain
 * nodes. Throws on layout failure (e.g. a cyclic compound graph) — callers
 * are responsible for error handling and any perf instrumentation.
 */
export declare const computeWorkflowLayout: (transformed: TransformResult, { direction }: {
    direction: LayoutDirection;
}) => LayoutSnapshot;
