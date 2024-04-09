/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * IMPORTANT:
 *
 * The types in this file are duplicated at
 * `packages/kbn-user-profile-components/src/user_profile.ts`
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
 * Placeholder for data stored in user profile.
 */
export type UserProfileData = Record<string, unknown>;

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
