import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { InternalUserProfileServiceSetup, InternalUserProfileServiceStart } from './internal_contracts';
export declare class UserProfileService implements CoreService<InternalUserProfileServiceSetup, InternalUserProfileServiceStart> {
    private readonly log;
    private delegate?;
    constructor(coreContext: CoreContext);
    setup(): InternalUserProfileServiceSetup;
    start(): InternalUserProfileServiceStart;
    stop(): void;
}
