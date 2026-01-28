/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @file Type definitions for the content management list route.
 *
 * This module defines the data structures used in the `/internal/content_management/list`
 * API endpoint, including request parameters, response shapes, and internal types for
 * query building and user resolution.
 */

import type { UserProfileAvatarData } from '@kbn/user-profile-components';

/**
 * Saved object reference structure as stored in Elasticsearch documents.
 * Used primarily for tag references in the list response.
 */
export interface Reference {
  type: string;
  id: string;
  name: string;
}

/**
 * User profile information for creators and updaters.
 * Included in list response items as `createdByUser` and `updatedByUser` fields.
 */
export interface UserInfo {
  username: string;
  email?: string;
  fullName?: string;
  avatar?: UserProfileAvatarData;
}

/**
 * Individual item in the list response, representing a saved object with enriched metadata.
 *
 * Includes all baseline fields required by the `ContentListItem` interface on the client.
 * User profile information is provided separately in the `users` map of the response to
 * avoid duplicating user data across multiple items.
 */
export interface ListResponseItem {
  id: string;
  type: string;
  updatedAt?: string;
  updatedBy?: string;
  createdAt?: string;
  createdBy?: string;
  managed?: boolean;
  references: Reference[]; // Always included, filtered to tags only.
  attributes: {
    title?: string;
    description?: string;
    [key: string]: unknown; // Additional attributes.
  };
}

/**
 * Mapping of raw filter inputs to their resolved canonical values.
 *
 * Returned in the list response to help clients deduplicate filter values.
 * For example, if a client filters by username "john.doe", the resolved filters
 * will map that username to the corresponding user profile UID.
 */
export interface ResolvedFilters {
  /** Maps raw createdBy inputs to resolved user profile UIDs. */
  createdBy?: Record<string, string>;
}

/**
 * Complete response structure for the `/internal/content_management/list` endpoint.
 */
export interface ListResponse {
  items: ListResponseItem[];
  total: number;
  /**
   * Map of user profile UIDs to user info. Contains entries for all unique
   * `createdBy` and `updatedBy` values found in the items array. Clients should
   * look up user info from this map using the UID from item fields.
   */
  users?: Record<string, UserInfo>;
  /** Maps raw filter inputs to their resolved canonical values. */
  resolvedFilters?: ResolvedFilters;
}

/**
 * Elasticsearch aggregation result structure for fetching distinct `created_by` values.
 * Used internally by {@link getDistinctCreators}.
 */
export interface DistinctCreatorsAggResult {
  unique_creators: {
    buckets: Array<{ key: string; doc_count: number }>;
  };
}

/**
 * Result of resolving `createdBy` filter values from usernames/emails to UIDs.
 * Returned by {@link resolveCreatedByFilter}.
 */
export interface ResolveCreatedByResult {
  /** Resolved user profile UIDs to use in the filter. */
  uids: string[];
  /** Mapping of original input values to resolved UIDs (for client deduplication). */
  inputToUidMap: Record<string, string>;
}
