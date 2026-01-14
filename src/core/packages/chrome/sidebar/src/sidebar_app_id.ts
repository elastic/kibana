/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Valid sidebar app IDs (explicitly listed production apps)
 */
const VALID_SIDEBAR_APP_IDS = [] as const;

/**
 * Prefix for example/test app IDs (any ID starting with this prefix is allowed)
 */
const EXAMPLE_APP_ID_PREFIX = 'sidebarExample';

/**
 * Type for known sidebar app IDs
 * Includes explicitly listed IDs and any ID starting with 'example-'
 */
export type SidebarAppId = (typeof VALID_SIDEBAR_APP_IDS)[number] | `sidebarExample${string}`;

/**
 * Runtime validation function for sidebar app IDs
 */
export function isValidSidebarAppId(appId: string): appId is SidebarAppId {
  // Check if it's in the explicit list
  if (VALID_SIDEBAR_APP_IDS.includes(appId as (typeof VALID_SIDEBAR_APP_IDS)[number])) {
    return true;
  }
  // Check if it starts with the example prefix
  if (appId.startsWith(EXAMPLE_APP_ID_PREFIX)) {
    return true;
  }
  return false;
}
