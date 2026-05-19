import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-browser';
import type { InternalUserProfileServiceStart } from '../internal_contracts';
export declare const convertUserProfileAPI: (delegate: CoreUserProfileDelegateContract) => InternalUserProfileServiceStart;
