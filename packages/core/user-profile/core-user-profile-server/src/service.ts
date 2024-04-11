/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  UserProfileData,
  UserProfileLabels,
  UserProfileWithSecurity,
  UserProfile,
} from '@kbn/core-user-profile-common';

/**
 * A set of methods to work with Kibana user profiles.
 */
export interface UserProfileService {
  /**
   * Retrieves a user profile for the current user extracted from the specified request. If the profile isn't available,
   * e.g. for the anonymous users or users authenticated via authenticating proxies, the `null` value is returned.
   * @param params Get current user profile operation parameters.
   * @param params.request User request instance to get user profile for.
   * @param params.dataPath By default Elasticsearch returns user information, but does not return any user data. The
   * optional "dataPath" parameter can be used to return personal data for the requested user profiles.
   */
  getCurrent<D extends UserProfileData, L extends UserProfileLabels>(
    params: UserProfileGetCurrentParams
  ): Promise<UserProfileWithSecurity<D, L> | null>;

  /**
   * Retrieves multiple user profiles by their identifiers.
   * @param params Bulk get operation parameters.
   * @param params.uids List of user profile identifiers.
   * @param params.dataPath By default Elasticsearch returns user information, but does not return any user data. The
   * optional "dataPath" parameter can be used to return personal data for the requested user profiles.
   */
  bulkGet<D extends UserProfileData>(
    params: UserProfileBulkGetParams
  ): Promise<Array<UserProfile<D>>>;

  /**
   * Suggests multiple user profiles by search criteria.
   * @param params Suggest operation parameters.
   * @param params.name Query string used to match name-related fields in user profiles. The following fields are treated as name-related: username, full_name and email.
   * @param params.size Desired number of suggestion to return. The default value is 10.
   * @param params.dataPath By default, suggest API returns user information, but does not return any user data. The optional "dataPath" parameter can be used to return personal data for this user (within `kibana` namespace only).
   * @param params.requiredPrivileges The set of the privileges that users associated with the suggested user profile should have in the specified space. If not specified, privileges check isn't performed and all matched profiles are returned irrespective to the privileges of the associated users.
   */
  suggest<D extends UserProfileData>(
    params: UserProfileSuggestParams
  ): Promise<Array<UserProfile<D>>>;
}

/**
 * The set of privileges that users associated with the suggested user profile should have for a specified space id.
 */
export interface UserProfileRequiredPrivileges {
  /**
   * The id of the Kibana Space.
   */
  spaceId: string;

  /**
   * The set of the Kibana specific application privileges.
   */
  privileges: { kibana: string[] };
}

/**
 * Parameters for the get user profile for the current user API.
 */
export interface UserProfileGetCurrentParams {
  /**
   * User request instance to get user profile for.
   */
  request: KibanaRequest;

  /**
   * By default, get API returns user information, but does not return any user data. The optional "dataPath"
   * parameter can be used to return personal data for this user (within `kibana` namespace only).
   */
  dataPath?: string;
}

/**
 * Parameters for the bulk get API.
 */
export interface UserProfileBulkGetParams {
  /**
   * List of user profile identifiers.
   */
  uids: Set<string>;

  /**
   * By default, suggest API returns user information, but does not return any user data. The optional "dataPath"
   * parameter can be used to return personal data for this user (within `kibana` namespace only).
   */
  dataPath?: string;
}

/**
 * Parameters for the suggest API.
 */
export interface UserProfileSuggestParams {
  /**
   * Query string used to match name-related fields in user profiles. The following fields are treated as
   * name-related: username, full_name and email.
   */
  name?: string;

  /**
   * Extra search criteria to improve relevance of the suggestion result. A profile matching the
   * specified hint is ranked higher in the response. But not-matching the hint does not exclude a
   * profile from the response as long as it matches the `name` field query.
   */
  hint?: {
    /**
     * A list of Profile UIDs to match against.
     */
    uids: string[];
  };

  /**
   * Desired number of suggestion to return. The default value is 10.
   */
  size?: number;

  /**
   * By default, suggest API returns user information, but does not return any user data. The optional "dataPath"
   * parameter can be used to return personal data for this user (within `kibana` namespace only).
   */
  dataPath?: string;

  /**
   * The set of the privileges that users associated with the suggested user profile should have in the specified space.
   * If not specified, privileges check isn't performed and all matched profiles are returned irrespective to the
   * privileges of the associated users.
   */
  requiredPrivileges?: UserProfileRequiredPrivileges;
}
