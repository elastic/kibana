import type { AgentBuilderPluginSetupContract } from '../../types';
import type { WorkflowsManagementApi } from '../../workflows_management/workflows_management_api';
export declare const GET_STEP_DEFINITIONS_TOOL_ID = "platform.workflows.get_step_definitions";
export declare function registerGetStepDefinitionsTool(agentBuilder: AgentBuilderPluginSetupContract, api: WorkflowsManagementApi): void;
