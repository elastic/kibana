import type { UserProfileService } from './service';
import type { CoreUserProfileDelegateContract } from './api_provider';
/**
 * Setup contract for Core's userProfile service.
 *
 * @public
 */
export interface UserProfileServiceSetup {
    /**
     * Register the userProfile implementation that will be used and re-exposed by Core.
     *
     * @remark this should **exclusively** be used by the security plugin.
     */
    registerUserProfileDelegate(delegate: CoreUserProfileDelegateContract): void;
}
/**
 * Start contract for Core's userProfile service.
 *
 * @public
 */
export type UserProfileServiceStart = UserProfileService;
