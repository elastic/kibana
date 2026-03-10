/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserFilter } from '../../../datasource';

/**
 * Sentinel value for items managed by Elastic (not user-created).
 *
 * Used in the user filter selection to represent managed items.
 */
export const MANAGED_USER_FILTER = '__managed__';

/**
 * Sentinel value for items with no creator attribution.
 *
 * Used in the user filter selection to represent items lacking a `createdBy` field.
 */
export const NO_CREATOR_USER_FILTER = '__no_creator__';

/**
 * Summary of all unique creators found across the full (unfiltered) item list.
 *
 * Derived from the query result before client-side user filtering is applied,
 * so the creator list never shrinks when a filter is active.
 */
export interface CreatorsList {
  /** UIDs of all users who created items. */
  uids: string[];
  /** Whether any items have no creator. */
  hasNoCreator: boolean;
  /** Whether any items are managed. */
  hasManaged: boolean;
}

/**
 * Return value from the `useContentListUserFilter` hook.
 */
export interface UseContentListUserFilterReturn {
  /** Deduplicated UIDs from all active user filter sources (UI + text). */
  selectedUsers: string[];
  /** Whether user filtering is supported (service + feature flag). */
  isSupported: boolean;
  /** Replace the {@link UserFilter} object. Pass `undefined` to clear. */
  setSelectedUsers: (userFilter: UserFilter | undefined) => void;
  /** Whether any user filter is currently active. */
  hasActiveFilter: boolean;
}
