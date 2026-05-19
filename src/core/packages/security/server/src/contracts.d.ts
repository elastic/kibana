import type { CoreFipsService } from './fips';
import type { CoreAuthenticationService } from './authc';
import type { CoreSecurityDelegateContract } from './api_provider';
import type { CoreAuditService } from './audit';
/**
 * Setup contract for Core's security service.
 *
 * @public
 */
export interface SecurityServiceSetup {
    /**
     * Register the security implementation that then will be used and re-exposed by Core.
     *
     * @remark this should **exclusively** be used by the security plugin.
     */
    registerSecurityDelegate(api: CoreSecurityDelegateContract): void;
    /**
     * The {@link CoreFipsService | FIPS service}
     */
    fips: CoreFipsService;
}
/**
 * Start contract for Core's security service.
 *
 * @public
 */
export interface SecurityServiceStart {
    /**
     * The {@link CoreAuthenticationService | authentication service}
     */
    authc: CoreAuthenticationService;
    /**
     * The {@link CoreAuditService | audit service}
     */
    audit: CoreAuditService;
}
