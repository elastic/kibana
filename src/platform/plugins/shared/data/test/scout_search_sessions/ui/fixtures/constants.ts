/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Elasticsearch archive path — loaded once in global.setup.ts (shared across workers).
export const LOGSTASH_FUNCTIONAL_ARCHIVE =
  'x-pack/platform/test/fixtures/es_archives/logstash_functional';

// Kibana archive paths — loaded per-space in spaceTest.beforeAll.
export const DASHBOARD_ASYNC_SEARCH_KBN_ARCHIVE =
  'x-pack/platform/test/functional/fixtures/kbn_archives/dashboard_async/async_search.json';

// Internal session management API path.
export const SESSION_API_PATH = '/internal/session';
