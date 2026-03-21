import type { ActionType as ConnectorType, ActionTypeExecutorOptions as ConnectorTypeExecutorOptions, ActionTypeExecutorResult as ConnectorTypeExecutorResult } from '@kbn/actions-plugin/server/types';
import type { ConnectorAdapter } from '@kbn/alerting-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import { type ScheduleWorkflowServiceFunction, type WorkflowsServiceFunction } from './service';
import type { AlertStates, ExecutorParams, WorkflowsActionParamsType, WorkflowsExecutorResultData } from './types';
export type ActionParamsType = WorkflowsActionParamsType;
export declare const ConnectorTypeId = ".workflows";
export interface WorkflowsRuleActionParams {
    subAction: 'run';
    subActionParams: {
        workflowId: string;
        summaryMode?: boolean;
        alertStates?: AlertStates;
    };
    [key: string]: unknown;
}
export interface GetWorkflowsConnectorTypeArgs {
    getWorkflowsService?: (request: KibanaRequest) => Promise<WorkflowsServiceFunction>;
    getScheduleWorkflowService?: (request: KibanaRequest) => Promise<ScheduleWorkflowServiceFunction>;
}
export declare function getConnectorType(deps?: GetWorkflowsConnectorTypeArgs): ConnectorType<Record<string, unknown>, Record<string, unknown>, ExecutorParams, WorkflowsExecutorResultData>;
export declare function executor(execOptions: ConnectorTypeExecutorOptions<Record<string, unknown>, Record<string, unknown>, WorkflowsActionParamsType>, deps?: GetWorkflowsConnectorTypeArgs): Promise<ConnectorTypeExecutorResult<WorkflowsExecutorResultData>>;
export declare function resolveAlertStates(alertStates?: Partial<AlertStates>): AlertStates;
export declare function getWorkflowsConnectorAdapter(): ConnectorAdapter<WorkflowsRuleActionParams, ExecutorParams>;
