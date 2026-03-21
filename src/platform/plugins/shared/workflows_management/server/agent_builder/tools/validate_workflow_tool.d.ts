import type { AgentBuilderPluginSetupContract } from '../../types';
import type { WorkflowsManagementApi } from '../../workflows_management/workflows_management_api';
export declare const VALIDATE_WORKFLOW_TOOL_ID = "platform.workflows.validate_workflow";
export declare function registerValidateWorkflowTool(agentBuilder: AgentBuilderPluginSetupContract, api: WorkflowsManagementApi): void;
