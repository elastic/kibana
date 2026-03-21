import type { Logger } from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { WorkflowsRouter } from '../../types';
import type { WorkflowsManagementApi } from '../workflows_management_api';
export declare function defineRoutes(router: WorkflowsRouter, api: WorkflowsManagementApi, logger: Logger, spaces: SpacesServiceStart, getWorkflowExecutionEngine: () => Promise<WorkflowsExecutionEnginePluginStart>): void;
