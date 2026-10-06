import type { AuthenticatedPrincipal, AuthenticatedUser } from '@kbn/core-security-common';
import type { AuditLogger } from './audit_logging/audit_logger';
import type { APIKeysWithContextType } from './authentication/api_keys';
export interface SecurityRequestHandlerContext {
    authc: AuthcRequestHandlerContext;
    audit: AuditRequestHandlerContext;
}
export interface AuthcRequestHandlerContext {
    getCurrentUser(): AuthenticatedUser | null;
    /** See `CoreAuthenticationService.getPrincipal`, bound to the context's request. */
    getPrincipal(): AuthenticatedPrincipal | null;
    apiKeys: APIKeysWithContextType;
}
export interface AuditRequestHandlerContext {
    logger: AuditLogger;
}
