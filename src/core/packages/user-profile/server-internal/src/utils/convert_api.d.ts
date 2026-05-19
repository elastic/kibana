import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-server';
import type { InternalUserProfileServiceStart } from '../internal_contracts';
export declare const convertUserProfileAPI: (delegate: CoreUserProfileDelegateContract) => InternalUserProfileServiceStart;
