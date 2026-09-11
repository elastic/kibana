/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** `my-example-logs` and `my-example-metrics` indices, 6 documents each. */
export const CONTEXT_AWARENESS_ES_ARCHIVE =
  'src/platform/test/functional/fixtures/es_archiver/discover/context_awareness';

/** Data views matching the {@link CONTEXT_AWARENESS_ES_ARCHIVE} indices. */
export const CONTEXT_AWARENESS_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/discover/context_awareness';

export const CONTEXT_AWARENESS_DATA_VIEWS = {
  ALL: 'my-example-*',
  LOGS: 'my-example-logs',
  METRICS: 'my-example-metrics',
  LOGS_AND_LOGSTASH: 'my-example-logs,logstash*',
} as const;

/** Time range covering the {@link CONTEXT_AWARENESS_ES_ARCHIVE} documents. */
export const CONTEXT_AWARENESS_TIME_RANGE = {
  from: '2024-06-10T14:00:00.000Z',
  to: '2024-06-10T16:30:00.000Z',
};

/**
 * The data grid virtualises rows, so only the ones that fit the viewport reach the DOM. The default
 * 1280x720 viewport renders just four rows once the tall summary column is in play, which is fewer
 * than the six the context awareness archive returns. Specs that assert over a whole result set
 * need the extra height: `spaceTest.use({ viewport: GRID_VIEWPORT })`.
 */
export const GRID_VIEWPORT = { width: 1920, height: 1080 } as const;

/**
 * `@timestamp` of every document in {@link CONTEXT_AWARENESS_ES_ARCHIVE}, newest first: the three
 * `my-example-logs` documents interleave with the three `my-example-metrics` ones.
 */
export const ALL_TIMESTAMPS_DESC = [
  '2024-06-10T16:30:00.000Z',
  '2024-06-10T16:00:00.000Z',
  '2024-06-10T15:30:00.000Z',
  '2024-06-10T15:00:00.000Z',
  '2024-06-10T14:30:00.000Z',
  '2024-06-10T14:00:00.000Z',
];

/** `@timestamp` of the `my-example-logs` documents only, newest first. */
export const LOGS_TIMESTAMPS_DESC = [
  '2024-06-10T16:00:00.000Z',
  '2024-06-10T15:00:00.000Z',
  '2024-06-10T14:00:00.000Z',
];

/**
 * `log.level` of the `my-example-logs` documents, newest first, capitalised the way the data source
 * profile's cell renderer displays them (`debug` / `error` / `info` in the source documents).
 */
export const LOGS_LEVELS_DESC = ['Debug', 'Error', 'Info'];

/**
 * Covers the `logstash_functional` documents, for the cases that query `logstash*` instead of the
 * context awareness indices.
 */
export const LOGSTASH_TIME_RANGE = {
  from: '2015-09-20T01:00:00.000Z',
  to: '2015-09-24T16:30:00.000Z',
};

/** Column ids `example-data-source-profile` defaults to for a logs data source. */
export const LOGS_PROFILE_COLUMNS = ['@timestamp', 'log.level', 'message'];

/**
 * Column ids shown when no profile contributes defaults. `_source` is the summary column, which
 * displays as "Summary".
 */
export const DEFAULT_PROFILE_COLUMNS = ['@timestamp', '_source'];

/**
 * Field `example-data-source-profile` defaults the histogram breakdown to for a logs data source.
 * Asserted through the selector button's `data-selected-value`: its label duplicates the field name
 * into a truncation overlay, so the rendered text reads as `Breakdown by log.levellog.level`.
 */
export const BREAKDOWN_FIELD = 'log.level';

/** Query the `example-root-profile` supplies through `getDefaultEsqlQuery`. */
export const ROOT_PROFILE_DEFAULT_ESQL_QUERY = 'FROM my-example-* | LIMIT 10';
