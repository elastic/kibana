/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * IMPORTANT:
 *
 * The types in this file are duplicated at
 * `src/platform/packages/shared/kbn-user-profile-components/src/user_profile.ts`
 *
 * When making changes please ensure to keep both files in sync.
 */

/**
 * Describes basic properties stored in user profile.
 */
export interface UserProfile<D extends UserProfileData = UserProfileData> {
  /**
   * Unique ID for of the user profile.
   */
  uid: string;

  /**
   * Indicates whether user profile is enabled or not.
   */
  enabled: boolean;

  /**
   * Information about the user that owns profile.
   */
  user: UserProfileUserInfo;

  /**
   * User specific data associated with the profile.
   */
  data: Partial<D>;
}

/**
 * Basic user information returned in user profile.
 */
export interface UserProfileUserInfo {
  /**
   * Username of the user.
   */
  username: string;
  /**
   * Optional email of the user.
   */
  email?: string;
  /**
   * Optional full name of the user.
   */
  full_name?: string;
}

/**
 * Placeholder for data stored in user profile,
 * services that store data in the user profile should specify said data by augmenting this type in it's implementation,
 * like so:
 *
 * @example
 * ```ts
 * declare module '@kbn/core-user-profile-common' {
 *   interface UserProfileData {
 *     myService: {
 *       myData: string;
 *     };
 *   }
 * }
 * ```
 * This will make it such that the return value for the invocation of `getCurrent` is typed matching the defined augmentation
 *
 * ```ts
 * const userProfile = await userProfileService.getCurrent();
 * // accessing 'myService.myData' is now typed as 'string'
 * console.log(userProfile.data.myService.myData);
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface -- See the comment above for an explanation.
export interface UserProfileData {}

/**
 * Type of the user profile labels structure (currently
 */
export type UserProfileLabels = Record<string, string>;

/**
 * Extended user information returned in user profile (both basic and security related properties).
 */
export interface UserProfileUserInfoWithSecurity extends UserProfileUserInfo {
  /**
   * List of the user roles.
   */
  roles: readonly string[];
  /**
   * Name of the Elasticsearch security realm that was used to authenticate user.
   */
  realm_name: string;
  /**
   * Optional name of the security domain that Elasticsearch security realm that was
   * used to authenticate user resides in (if any).
   */
  realm_domain?: string;
}

/**
 * Describes all properties stored in user profile (both basic and security related properties).
 */
export interface UserProfileWithSecurity<
  D extends UserProfileData = UserProfileData,
  L extends UserProfileLabels = UserProfileLabels
> extends UserProfile<D> {
  /**
   * Information about the user that owns profile.
   */
  user: UserProfileUserInfoWithSecurity;

  /**
   * User specific _searchable_ labels associated with the profile. Note that labels are considered
   * security related field since it's going to be used to store user's space ID.
   */
  labels: L;
}
