export declare const WORKFLOW_EXECUTE_STEP_TYPE: 'workflow.execute';
export declare const WORKFLOW_EXECUTE_ASYNC_STEP_TYPE: 'workflow.executeAsync';
export declare const isExecuteSyncStepType: (stepType: string | undefined) => boolean;
export declare const isExecuteAsyncStepType: (stepType: string | undefined) => boolean;
export declare const isExecuteStepType: (stepType: string | undefined) => boolean;
export type ParentWorkflowInvocation = 'sync' | 'async';
export declare const isSyncParentInvocation: (context: Record<string, unknown> | undefined) => context is Record<string, unknown> & {
    parentWorkflowInvocation: 'sync';
    parentWorkflowExecutionId: string;
};
/**
 * True when a parent workflow step did not start the execution, so it is the root of its own
 * lineage chain. Execution scheduling uses `isWorkflowStepTriggered` directly, so widening what
 * counts as a chain here can't change how runs are scheduled.
 */
export declare const isTopLevelWorkflowExecution: ({ triggeredBy }: {
    triggeredBy?: string;
}) => boolean;
