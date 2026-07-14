import type { CoreAuditService } from './audit';
import type { CoreAuthenticationService, FakeRequestEnricher } from './authc';
/**
 * The contract exposed by the security provider for Core to
 * consume and re-expose via its security service.
 *
 * @public
 */
export interface CoreSecurityDelegateContract {
    authc: AuthenticationServiceContract;
    audit: AuditServiceContract;
    /**
     * Binds a `profile_uid` to a fake request. The delegate owns the storage
     * (typically a WeakMap) consulted by its own `authc.getCurrentUser`. Core
     * re-exposes this via the one-shot
     * {@link SecurityServiceSetup.acquireFakeRequestEnricher} accessor.
     *
     * @internal
     */
    fakeRequestEnricher: FakeRequestEnricher;
}
/**
 * The authentication contract that the security provider must implement.
 * Mirrors {@link CoreAuthenticationService}; the delegate's `getCurrentUser`
 * is responsible for surfacing the synthetic user produced by
 * {@link CoreSecurityDelegateContract.fakeRequestEnricher}.
 *
 * @public
 */
export type AuthenticationServiceContract = CoreAuthenticationService;
export type AuditServiceContract = CoreAuditService;
