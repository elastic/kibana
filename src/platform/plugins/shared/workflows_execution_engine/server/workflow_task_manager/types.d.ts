export declare const WORKFLOW_RESUME_TASK_TYPE = "workflow:resume";
export interface StartWorkflowExecutionParams {
    workflowRunId: string;
    spaceId: string;
}
export interface ResumeWorkflowExecutionParams {
    workflowRunId: string;
    spaceId: string;
}
