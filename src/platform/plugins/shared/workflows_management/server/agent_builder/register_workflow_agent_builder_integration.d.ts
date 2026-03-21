import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetupContract } from '../types';
import type { WorkflowsManagementApi } from '../workflows_management/workflows_management_api';
interface RegisterWorkflowAgentBuilderIntegrationParams {
    agentBuilder: AgentBuilderPluginSetupContract;
    logger: Logger;
    api: WorkflowsManagementApi;
}
export declare function registerWorkflowAgentBuilderIntegration({ agentBuilder, logger, api, }: RegisterWorkflowAgentBuilderIntegrationParams): void;
export {};
