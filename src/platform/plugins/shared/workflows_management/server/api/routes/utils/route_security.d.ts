import type { RouteSecurity } from '@kbn/core-http-server';
/**
 * Security configuration objects ready to be used in route definitions.
 *
 * Privilege model:
 * - Routes that return workflow data to the caller require `read`.
 * - Routes that return execution data require `readExecution`.
 * - Mutating routes (update / delete) perform internal reads as part of the
 *   write operation (merge, space-scoping). These reads are implementation
 *   details and do NOT require the `read` privilege.
 * - `get_workflows` and `get_stats` conditionally include execution data when
 *   the user also holds `readExecution` (checked at runtime via `authzResult`).
 */
export declare const WORKFLOW_READ_SECURITY: RouteSecurity;
/**
 * This security configuration allows either `read` or `readExecution` privilege.
 * This is used to include optional `readExecution` privilege.
 * The `read` privilege needs to be checked explicitly in the route handler to enforce it.
 */
export declare const WORKFLOW_READ_OR_READ_EXECUTIONS_SECURITY: RouteSecurity;
export declare const WORKFLOW_CREATE_SECURITY: RouteSecurity;
export declare const WORKFLOW_CLONE_SECURITY: RouteSecurity;
export declare const WORKFLOW_BULK_CREATE_SECURITY: RouteSecurity;
export declare const WORKFLOW_UPDATE_SECURITY: RouteSecurity;
export declare const WORKFLOW_DELETE_SECURITY: RouteSecurity;
export declare const WORKFLOW_EXECUTE_SECURITY: RouteSecurity;
export declare const WORKFLOW_EXECUTION_READ_SECURITY: RouteSecurity;
export declare const WORKFLOW_EXECUTION_CANCEL_SECURITY: RouteSecurity;
export declare const WORKFLOW_EXECUTION_RESUME_SECURITY: RouteSecurity;
