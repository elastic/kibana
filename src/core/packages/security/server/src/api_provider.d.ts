import type { CoreAuditService } from './audit';
import type { CoreAuthenticationService } from './authc';
/**
 * The contract exposed by the security provider for Core to
 * consume and re-expose via its security service.
 *
 * @public
 */
export interface CoreSecurityDelegateContract {
    authc: AuthenticationServiceContract;
    audit: AuditServiceContract;
}
/**
 * @public
 */
export type AuthenticationServiceContract = CoreAuthenticationService;
export type AuditServiceContract = CoreAuditService;
