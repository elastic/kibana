import type { AgentBuilderPluginSetupContract } from '../../types';
import type { WorkflowsManagementApi } from '../../workflows_management/workflows_management_api';
export declare const GET_WORKFLOW_TOOL_ID = "platform.workflows.get_workflow";
export declare function registerGetWorkflowTool(agentBuilder: AgentBuilderPluginSetupContract, api: WorkflowsManagementApi): void;
