import type { ExternalServiceApiHandlerArgs, WorkflowsExecutorResultData } from './types';
export declare const api: {
    readonly run: ({ externalService, params, logger, }: ExternalServiceApiHandlerArgs) => Promise<WorkflowsExecutorResultData>;
};
