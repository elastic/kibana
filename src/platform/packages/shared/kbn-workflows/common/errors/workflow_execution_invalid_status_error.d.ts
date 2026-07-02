export declare class WorkflowExecutionInvalidStatusError extends Error {
    constructor(executionId: string, currentStatus: string, expectedStatus: string);
}
