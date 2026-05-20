import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { TriggerType } from '@kbn/workflows';
import type { ExternalService } from './types';
export type WorkflowsServiceFunction = (workflowId: string, spaceId: string, inputs: Record<string, unknown>, request: KibanaRequest) => Promise<string>;
export type ScheduleWorkflowServiceFunction = (workflowId: string, spaceId: string, inputs: Record<string, unknown>, triggeredBy: TriggerType, request: KibanaRequest) => Promise<string>;
export declare const createExternalService: (_actionId: string, logger: Logger, _configurationUtilities: ActionsConfigurationUtilities, _connectorUsageCollector: ConnectorUsageCollector, request: KibanaRequest, runWorkflowService?: WorkflowsServiceFunction, scheduleWorkflowService?: ScheduleWorkflowServiceFunction) => ExternalService;
