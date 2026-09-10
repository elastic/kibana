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
 * Covers the `logstash_functional` documents, for the cases that query `logstash*` instead of the
 * context awareness indices.
 */
export const LOGSTASH_TIME_RANGE = {
  from: '2015-09-20T01:00:00.000Z',
  to: '2015-09-24T16:30:00.000Z',
};

/** Query the `example-root-profile` supplies through `getDefaultEsqlQuery`. */
export const ROOT_PROFILE_DEFAULT_ESQL_QUERY = 'FROM my-example-* | LIMIT 10';
