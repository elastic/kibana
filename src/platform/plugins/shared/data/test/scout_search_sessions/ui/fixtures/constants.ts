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
export const SESSION_IN_ANOTHER_SPACE_KBN_ARCHIVE =
  'x-pack/platform/test/functional/fixtures/kbn_archives/dashboard/session_in_another_space';
export const LENS_BASIC_KBN_ARCHIVE =
  'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json';
export const DISCOVER_DEFAULT_KBN_ARCHIVE =
  'x-pack/platform/test/functional/fixtures/kbn_archives/discover/default';

// Sample data set installed via `apiServices.sampleData` for the ES|QL specs.
export const FLIGHTS_SAMPLE_DATA_SET = 'flights';

// The window the logstash-* archive holds documents in.
export const LOGSTASH_TIME_RANGE = {
  from: '2015-09-19T06:31:44.000Z',
  to: '2015-09-23T18:31:44.000Z',
} as const;

// Wider window used by the space-scoped archives.
export const LOGSTASH_MONTH_TIME_RANGE = {
  from: '2015-09-01T00:00:00.000Z',
  to: '2015-10-01T00:00:00.000Z',
} as const;

/**
 * `error_query` stalls the shards for a fixed duration, giving a test a window in which the
 * search is still running and can be sent to the background.
 *
 * It is provided by the `test-error-query` Elasticsearch module, which only ships with test
 * builds — specs using this must stay tagged `@local-stateful-classic` (no Cloud).
 */
export const STALLING_DSL_FILTER = JSON.stringify({
  error_query: {
    indices: [
      {
        error_type: 'none',
        name: '*',
        stall_time_seconds: 5,
      },
    ],
  },
});
