/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Sentinel UID representing system-managed items in `filters.user`.
 *
 * Not a real user ID — used to filter for items where `item.managed === true`.
 */
export const MANAGED_USER_FILTER = '__managed__';

/**
 * Sentinel UID representing items with no creator in `filters.user`.
 *
 * Not a real user ID — used to filter for items where `item.createdBy` is absent
 * and `item.managed` is falsy.
 */
export const NO_CREATOR_USER_FILTER = '__no_creator__';

/**
 * EUI query field name for the `createdBy` filter clause.
 *
 * Used by the query parser and resolver to read/write `createdBy:(...)` syntax
 * in `EuiSearchBar` queries.
 */
export const CREATED_BY_FIELD_NAME = 'createdBy';

/**
 * Query-bar value written for the {@link MANAGED_USER_FILTER} sentinel.
 *
 * This is the display string that appears in the search bar when the
 * "Managed" option is selected in the "Created by" filter popover.
 */
export const MANAGED_QUERY_VALUE = 'managed';

/**
 * Query-bar value written for the {@link NO_CREATOR_USER_FILTER} sentinel.
 *
 * This is the display string that appears in the search bar when the
 * "No creator" option is selected in the "Created by" filter popover.
 */
export const NO_CREATOR_QUERY_VALUE = 'none';
