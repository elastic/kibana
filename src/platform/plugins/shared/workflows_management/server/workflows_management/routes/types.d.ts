import type { Logger } from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { ExecutionStatus, ExecutionType } from '@kbn/workflows';
import type { WorkflowsRouter } from '../../types';
import type { WorkflowsManagementApi } from '../workflows_management_api';
export declare const MAX_PAGE_SIZE = 100;
/**
 * Helper function to parse execution statuses from query parameters
 * Handles both single string and array of strings
 */
export declare function parseExecutionStatuses(statuses: string | ExecutionStatus[] | undefined): ExecutionStatus[] | undefined;
/**
 * Helper function to parse execution types from query parameters
 * Handles both single string and array of strings
 */
export declare function parseExecutionTypes(executionTypes?: ExecutionType | ExecutionType[] | undefined): ExecutionType[] | undefined;
export interface RouteDependencies {
    router: WorkflowsRouter;
    api: WorkflowsManagementApi;
    logger: Logger;
    spaces: SpacesServiceStart;
}
export type RouteHandler = (deps: RouteDependencies) => void;
