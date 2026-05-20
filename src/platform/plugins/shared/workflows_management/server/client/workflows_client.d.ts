import type { Logger } from '@kbn/core/server';
import type { ManagedWorkflowsSystemApiProvider, WorkflowsClientProvider } from '@kbn/workflows/server/types';
import type { WorkflowsService } from '../api/workflows_management_service';
import type { WorkflowsManagementConfig } from '../config';
export declare const createWorkflowsClientProvider: (workflowsService: WorkflowsService, config: WorkflowsManagementConfig, logger: Logger) => WorkflowsClientProvider;
export declare const createManagedWorkflowsSystemApiProvider: (workflowsService: WorkflowsService, config: WorkflowsManagementConfig, logger: Logger) => ManagedWorkflowsSystemApiProvider;
