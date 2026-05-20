import type { Logger } from '@kbn/core/server';
import type { SpacesServiceSetup } from '@kbn/spaces-plugin/server';
import type { WorkflowManagementAuditLog } from './utils/workflow_audit_logging';
import type { WorkflowsRouter } from '../../types';
import type { WorkflowsManagementApi } from '../workflows_management_api';
import type { WorkflowsService } from '../workflows_management_service';
export interface RouteDependencies {
    router: WorkflowsRouter;
    api: WorkflowsManagementApi;
    service: WorkflowsService;
    logger: Logger;
    spaces: SpacesServiceSetup;
    audit: WorkflowManagementAuditLog;
}
export type RouteHandler = (deps: RouteDependencies) => void;
