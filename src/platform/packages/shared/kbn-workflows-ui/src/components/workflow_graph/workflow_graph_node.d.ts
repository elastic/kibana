import { useEuiTheme } from '@elastic/eui';
import type { Node, NodeProps } from '@xyflow/react';
import React from 'react';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
export interface WorkflowGraphNodeData extends Record<string, unknown> {
    readonly label: string;
    readonly stepType: string;
    readonly isTrigger?: boolean;
    readonly stepExecution?: WorkflowStepExecutionDto;
    /** Icon-only compact render (workflow-list popover). */
    readonly preview?: boolean;
    /**
     * Raw step definition attached by `transformWorkflowToGraph`. Read by the
     * node to surface configuration the row UI cares about (e.g. retry-on-failure
     * `max-attempts` for the badge) without having to thread the workflow YAML
     * down a second time.
     */
    readonly step?: {
        readonly retry?: {
            readonly 'max-attempts'?: number;
        };
        readonly 'on-failure'?: {
            readonly retry?: {
                readonly 'max-attempts'?: number;
            };
        };
    };
}
interface NodePalette {
    readonly outerBorder: string;
    readonly iconAreaBg: string;
    readonly innerBoxBorder: string;
    readonly iconColor: string;
    readonly selectedBorder: string;
}
type EuiTheme = ReturnType<typeof useEuiTheme>['euiTheme'];
interface ExecutionState {
    readonly isRunning: boolean;
    readonly isSuccess: boolean;
    readonly isFailed: boolean;
}
interface NodeColors {
    readonly palette: NodePalette;
    readonly triggerIconColor: string;
    readonly stepLabelColor: string;
    readonly borderColor: string;
    readonly iconAreaBg: string;
    readonly innerBoxBorder: string;
    readonly iconColor: string;
    readonly forceTriggerPinkFill: boolean;
    readonly retryBadgeBg: string;
    readonly retryBadgeColor: string;
    readonly statusSuccessColor: string;
    readonly statusFailColor: string;
    readonly borderRadius: number;
    readonly hasStatusIcon: boolean;
}
export declare function resolveNodeColors(euiTheme: EuiTheme, isTriggerNode: boolean, { isRunning, isSuccess, isFailed }: ExecutionState, isActive: boolean): NodeColors;
declare function WorkflowGraphNodeInner(node: NodeProps<Node<WorkflowGraphNodeData>>): React.JSX.Element;
export declare const WorkflowGraphNode: React.MemoExoticComponent<typeof WorkflowGraphNodeInner>;
export {};
