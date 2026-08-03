import type { Edge, Node } from '@xyflow/react';
import type { LayoutDirection, TransformResult, WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
interface UseWorkflowLayoutParams {
    workflow: WorkflowYaml | undefined;
    /**
     * Optional precomputed transform result for this exact workflow snapshot.
     * When provided, the hook will reuse it instead of calling `transformWorkflowToGraph`.
     */
    transformed?: TransformResult;
    stepExecutions?: WorkflowStepExecutionDto[];
    /** Dagre rank direction: `'TB'` (default) or `'LR'`. */
    direction?: LayoutDirection;
    onPerfMark?: (name: 'transform_ms' | 'layout_ms', ms: number) => void;
    onLayoutFailed?: (reason: string) => void;
}
interface UseWorkflowLayoutResult {
    nodes: Node[];
    edges: Edge[];
}
/**
 * Memoized YAML→graph transform + dagre layout. Layout is keyed on the
 * topology fingerprint so non-structural edits (description, params, etc.)
 * never retrigger dagre.
 *
 * Step-execution status is merged onto node data without retriggering layout.
 */
export declare function useWorkflowLayout({ workflow, transformed: transformedProp, stepExecutions, direction, onPerfMark, onLayoutFailed, }: UseWorkflowLayoutParams): UseWorkflowLayoutResult;
export {};
