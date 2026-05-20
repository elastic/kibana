import type { AlertHit } from '@kbn/alerting-plugin/server/types';
import type { Logger } from '@kbn/core/server';
import type { TriggerType } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import type { ExecutorParamsSchema } from './schema';
export type ExecutorParams = z.infer<typeof ExecutorParamsSchema>;
export type WorkflowsActionParamsType = ExecutorParams;
export interface AlertStates {
    new: boolean;
    ongoing: boolean;
    recovered: boolean;
}
export interface RunWorkflowParams {
    workflowId: string;
    spaceId: string;
    summaryMode?: boolean;
    alertStates?: AlertStates;
    inputs: {
        event: {
            alerts: AlertHit[];
            rule: {
                id: string;
                name: string;
                tags: string[];
                consumer: string;
                producer: string;
                ruleTypeId: string;
            };
            ruleUrl?: string;
            spaceId: string;
        };
    };
    [key: string]: unknown;
}
export type ExecutorSubActionRunParams = RunWorkflowParams;
export interface WorkflowsExecutorResultData {
    workflowRunId: string;
    status: string;
}
export interface WorkflowExecutionResponse {
    workflowRunId: string;
    status: string;
}
export interface ScheduleWorkflowParams {
    workflowId: string;
    spaceId: string;
    inputs: {
        event: {
            alerts: AlertHit[];
            rule: {
                id: string;
                name: string;
                tags: string[];
                consumer: string;
                producer: string;
                ruleTypeId: string;
            };
            ruleUrl?: string;
            spaceId: string;
        };
    };
    triggeredBy?: TriggerType | undefined;
}
export interface ExternalService {
    runWorkflow: (params: RunWorkflowParams) => Promise<WorkflowExecutionResponse>;
    scheduleWorkflow: (params: ScheduleWorkflowParams) => Promise<string>;
}
export interface ExternalServiceApiHandlerArgs {
    externalService: ExternalService;
    params: ExecutorSubActionRunParams;
    logger: Logger;
}
