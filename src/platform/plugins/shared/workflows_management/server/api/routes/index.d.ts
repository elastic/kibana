import type { Logger } from '@kbn/core/server';
import type { SpacesServiceSetup } from '@kbn/spaces-plugin/server';
import type { WorkflowManagementAuditLog } from './utils/workflow_audit_logging';
import type { WorkflowsRouter } from '../../types';
import type { WorkflowsManagementApi } from '../workflows_management_api';
import type { WorkflowsService } from '../workflows_management_service';
export declare function defineRoutes(router: WorkflowsRouter, api: WorkflowsManagementApi, logger: Logger, spaces: SpacesServiceSetup, service: WorkflowsService, audit: WorkflowManagementAuditLog): void;
