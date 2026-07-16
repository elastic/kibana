/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Dashboard API base path (no leading slash — for use with apiClient). */
export const DASHBOARD_API_PATH = 'api/dashboards';
// In 9.3 the public Dashboard API is still internal and pinned to version '1'
// (see INTERNAL_API_VERSION in the dashboard plugin). The '2023-10-31' public
// version only exists on later branches.
export const DASHBOARD_API_VERSION = '1';

/** Favorites API base path (no leading slash — for use with apiClient). */
export const FAVORITES_API_PATH = 'internal/content_management/favorites';

/** Headers for versioned public Dashboard API requests. */
export const DASHBOARD_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': DASHBOARD_API_VERSION,
} as const;

/** Headers for internal API requests (favorites, security/me, telemetry). */
export const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
} as const;
