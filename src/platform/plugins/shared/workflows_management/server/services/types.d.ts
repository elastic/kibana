import type { ActionsClient, IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { ElasticsearchClient, KibanaRequest, Logger, SecurityServiceStart } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { IWorkflowEventLoggerService } from '@kbn/workflows-execution-engine/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowExecutionQueryService } from './workflow_execution_query_service';
import type { WorkflowValidationService } from './workflow_validation_service';
import type { WorkflowStorage } from '../storage/workflow_storage';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
/** Core deps shared by all services that access workflow storage. */
export interface WorkflowStorageDeps {
    logger: Logger;
    workflowStorage: WorkflowStorage;
}
/** Deps for WorkflowCrudService (CRUD + deletion + disable-all). */
export interface WorkflowCrudDeps extends WorkflowStorageDeps {
    esClient: ElasticsearchClient;
    getSecurity: () => SecurityServiceStart | undefined;
    workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined;
    getTaskScheduler: () => WorkflowTaskScheduler | null;
    executionQueryService: WorkflowExecutionQueryService;
    validationService: WorkflowValidationService;
}
/** Deps for WorkflowSearchService. */
export interface WorkflowSearchDeps extends WorkflowStorageDeps {
    esClient: ElasticsearchClient;
}
/** Deps for WorkflowExecutionQueryService. */
export interface WorkflowExecutionQueryDeps {
    logger: Logger;
    esClient: ElasticsearchClient;
    workflowEventLoggerService: IWorkflowEventLoggerService;
}
/** Deps for WorkflowValidationService. */
export interface WorkflowValidationDeps {
    workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined;
    getActionsClient: () => Promise<IUnsecuredActionsClient>;
    getActionsClientWithRequest: (request: KibanaRequest) => Promise<PublicMethodsOf<ActionsClient>>;
}
