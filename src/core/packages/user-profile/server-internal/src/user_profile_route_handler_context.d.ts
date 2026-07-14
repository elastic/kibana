import type { KibanaRequest } from '@kbn/core-http-server';
import type { UserProfileRequestHandlerContext } from '@kbn/core-user-profile-server';
import type { UserProfileData, UserProfileLabels, UserProfileWithSecurity } from '@kbn/core-user-profile-common';
import type { InternalUserProfileServiceStart } from './internal_contracts';
export declare class CoreUserProfileRouteHandlerContext implements UserProfileRequestHandlerContext {
    private readonly userProfileStart;
    private readonly request;
    constructor(userProfileStart: InternalUserProfileServiceStart, request: KibanaRequest);
    getCurrent<D extends UserProfileData, L extends UserProfileLabels>({ dataPath, }?: {
        dataPath?: string;
    }): Promise<UserProfileWithSecurity<D, L> | null>;
}
