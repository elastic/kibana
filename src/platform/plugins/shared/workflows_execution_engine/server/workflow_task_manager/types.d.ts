export declare const WORKFLOW_RUN_TASK_TYPE = "workflow:run";
export declare const WORKFLOW_RESUME_TASK_TYPE = "workflow:resume";
export declare const WORKFLOW_SCHEDULED_TASK_TYPE = "workflow:scheduled";
export interface StartWorkflowExecutionParams {
    workflowRunId: string;
    spaceId: string;
}
export interface ResumeWorkflowExecutionParams {
    workflowRunId: string;
    spaceId: string;
}
