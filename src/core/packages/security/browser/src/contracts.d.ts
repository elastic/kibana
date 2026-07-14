import type { CoreAuthenticationService } from './authc';
import type { CoreSecurityDelegateContract } from './api_provider';
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
}
