export declare class WorkflowDisabledError extends Error {
    readonly isUserError: true;
    constructor(workflowId: string);
}
