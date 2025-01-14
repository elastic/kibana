/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { UserAvatarProps, UserProfileWithAvatar } from './src/user_avatar';
export type { UserToolTipProps } from './src/user_tooltip';
export type { UserProfilesSelectableProps } from './src/user_profiles_selectable';
export type { UserProfilesPopoverProps } from './src/user_profiles_popover';
export { UserAvatar } from './src/user_avatar';
export { UserAvatarTip } from './src/user_avatar_tip';
export { UserToolTip } from './src/user_tooltip';
export { UserProfilesSelectable } from './src/user_profiles_selectable';
export { UserProfilesPopover } from './src/user_profiles_popover';
export { getUserDisplayName } from './src/user_profile';
export type {
  UserProfile,
  UserProfileUserInfo,
  GetUserDisplayNameParams,
} from './src/user_profile';
export type {
  UserProfileData,
  UserSettingsData,
  DarkModeValue,
  UserProfileAvatarData,
} from './src/types';
export { useUpdateUserProfile, type UpdateUserProfileHook } from './src/hooks';
export {
  UserProfilesKibanaProvider,
  UserProfilesProvider,
  type UserProfilesKibanaDependencies,
} from './src/services';
