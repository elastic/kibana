import type { AgentBuilderPluginSetupContract } from '../../types';
import type { WorkflowsManagementApi } from '../../workflows_management/workflows_management_api';
export declare const GET_CONNECTORS_TOOL_ID = "platform.workflows.get_connectors";
export declare function registerGetConnectorsTool(agentBuilder: AgentBuilderPluginSetupContract, api: WorkflowsManagementApi): void;
