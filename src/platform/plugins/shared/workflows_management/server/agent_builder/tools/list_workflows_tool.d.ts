import type { AgentBuilderPluginSetupContract } from '../../types';
import type { WorkflowsManagementApi } from '../../workflows_management/workflows_management_api';
export declare const LIST_WORKFLOWS_TOOL_ID = "platform.workflows.list_workflows";
export declare function registerListWorkflowsTool(agentBuilder: AgentBuilderPluginSetupContract, api: WorkflowsManagementApi): void;
