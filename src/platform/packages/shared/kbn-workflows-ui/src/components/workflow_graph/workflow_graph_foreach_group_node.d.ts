import type { Node, NodeProps } from '@xyflow/react';
import React from 'react';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
interface ForeachGroupNodeData extends Record<string, unknown> {
    readonly label: string;
    /** The original step type (e.g. `'foreach'`, `'while'`). */
    readonly stepType: string;
    /** Optional execution status threaded through from the canvas. */
    readonly stepExecution?: WorkflowStepExecutionDto;
}
declare function WorkflowGraphForeachGroupNodeInner(node: NodeProps<Node<ForeachGroupNodeData>>): React.JSX.Element;
export declare const WorkflowGraphForeachGroupNode: React.MemoExoticComponent<typeof WorkflowGraphForeachGroupNodeInner>;
export {};
