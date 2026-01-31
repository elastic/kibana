/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** The base API path for dashboard endpoints (no leading slash for apiClient). */
export const DASHBOARD_API_PATH = 'api/dashboards';

/** Common headers for Dashboard API requests (internal API version 1) */
export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
} as const;

/** Test data paths */
export const KBN_ARCHIVES = {
  BASIC: 'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json',
  TAGS: 'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/tags.json',
  MANY_DASHBOARDS:
    'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/many-dashboards.json',
} as const;

/** Test dashboard ID used in fixtures - is a saved object loaded by the kbn_archiver */
export const TEST_DASHBOARD_ID = 'be3733a0-9efe-11e7-acb3-3dab96693fab';
