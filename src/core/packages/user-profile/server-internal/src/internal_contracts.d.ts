import type { UserProfileServiceSetup, UserProfileServiceStart, CoreUserProfileDelegateContract } from '@kbn/core-user-profile-server';
export type InternalUserProfileServiceSetup = UserProfileServiceSetup;
export type InternalUserProfileServiceStart = UserProfileServiceStart & Pick<CoreUserProfileDelegateContract, 'update'>;
