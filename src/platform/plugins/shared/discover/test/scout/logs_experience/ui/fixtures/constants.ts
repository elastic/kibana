/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';

export const LOGS_EXPERIENCE_TAGS = [...tags.stateful.all, ...tags.serverless.observability.all];

/**
 * The doc viewer flyout is a push flyout only from EUI's `xl` breakpoint up; below it, EUI falls
 * back to an overlay whose mask swallows clicks on the grid behind it. The doc-viewer specs click
 * leading controls while the flyout is open, so they need the push layout.
 */
export const PUSH_FLYOUT_VIEWPORT = { width: 1600, height: 1200 };

const SYNTH_LOGS_DATASET = 'synth.recommended';
const SYNTH_LOGS_DATA_VIEW = `logs-${SYNTH_LOGS_DATASET}-*`;

// A dataset of its own rather than extra documents in `synth.recommended`: the summary-column and
// pagination specs assert on that dataset's rows, and stack traces plus oversized `log.level`
// values would change what they see.
const SYNTH_DOCVIEWER_DATASET = 'synth.docviewer';
const SYNTH_DOCVIEWER_DATA_VIEW = `logs-${SYNTH_DOCVIEWER_DATASET}-*`;

// Documents without any message-like field, which is what hides the Log overview tab.
const SYNTH_NO_MESSAGE_DATASET = 'synth.nomessage';
const SYNTH_NO_MESSAGE_DATA_VIEW = `logs-${SYNTH_NO_MESSAGE_DATASET}-*`;

// Exactly three documents with hand-picked `log.level` and `service.name` values, so the
// row-indicator, cell-renderer and surrounding-document specs can assert on fixed row positions.
// Kept apart from `synth.recommended`, whose row contents other specs already depend on.
const SYNTH_CONTEXT_DATASET = 'synth.context';
const SYNTH_CONTEXT_DATA_VIEW = `logs-${SYNTH_CONTEXT_DATASET}-*`;

// More documents than two sample sizes, so the footer can be driven from 500 to 1,000 loaded rows
// and then past the total, where it disappears.
const SYNTH_FETCH_MORE_DATASET = 'synth.fetchmore';
const SYNTH_FETCH_MORE_DATA_VIEW = `logs-${SYNTH_FETCH_MORE_DATASET}-*`;

export const LOGS = {
  // Fixed rather than moment-relative: global setup seeds this range once, and each worker
  // sets it as the default time, so both must resolve to the same window.
  DEFAULT_START_TIME: '2025-01-01T00:00:00.000Z',
  DEFAULT_END_TIME: '2025-01-01T01:00:00.000Z',

  SYNTH_LOGS_DATASET,
  SYNTH_LOGS_NAMESPACE: 'default',
  SYNTH_LOGS_HOST: 'synth-host',
  SYNTH_LOGS_MESSAGE: 'Test log message for the logs profile',

  SYNTH_LOGS_DATA_VIEW,
  SYNTH_LOGS_ESQL_QUERY: `from ${SYNTH_LOGS_DATA_VIEW} | limit 100`,

  // A plain index, not a data stream: the `metrics-*` Fleet templates create TSDB data streams,
  // which reject writes outside a moving window around now and so cannot hold the fixed
  // timestamps above. The name also stays clear of `metrics-*-*` so no Fleet template claims it.
  NON_LOGS_INDEX: 'synth-metrics-2025',
  NON_LOGS_DATA_VIEW: 'synth-metrics*',
  NON_LOGS_HOST: 'synth-metrics-host-01',
  NON_LOGS_ESQL_QUERY: 'from synth-metrics* | sort @timestamp desc',

  // A non-logs index whose documents carry the very fields the logs data source profile renders
  // specially, so the cell-renderer, row-indicator and summary negatives fail only when the profile
  // wrongly resolves, not merely because the field is absent. Kept apart from `NON_LOGS_INDEX`:
  // in an Observability space any record with a `log.*` field matches the log document profile, so
  // these documents do get a Log overview tab and cannot serve as the doc viewer negative case.
  NON_LOGS_FIELDS_INDEX: 'synth-nonlogs-fields',
  NON_LOGS_FIELDS_DATA_VIEW: 'synth-nonlogs-fields*',
  NON_LOGS_FIELDS_ESQL_QUERY: 'from synth-nonlogs-fields* | sort @timestamp desc',
  NON_LOGS_LOG_LEVEL: 'debug',
  NON_LOGS_SERVICE_NAME: 'product',
  NON_LOGS_MESSAGE: 'Non-logs document that still has a message field',

  SYNTH_DOCVIEWER_DATASET,
  SYNTH_DOCVIEWER_DATA_VIEW,

  SYNTH_NO_MESSAGE_DATASET,
  SYNTH_NO_MESSAGE_DATA_VIEW,

  SYNTH_CONTEXT_DATASET,
  SYNTH_CONTEXT_DATA_VIEW,
  SYNTH_CONTEXT_ESQL_QUERY: `from ${SYNTH_CONTEXT_DATA_VIEW} | sort @timestamp desc`,
  /**
   * In grid display order: the documents are a minute apart and the grid sorts `@timestamp`
   * descending, so index 0 here is the newest document and therefore row 0 of the grid.
   */
  SYNTH_CONTEXT_ROWS: [
    { logLevel: 'debug', serviceName: 'product' },
    { logLevel: 'error', serviceName: 'checkout' },
    { logLevel: 'info', serviceName: 'accounting' },
  ],

  // A plain index whose name matches the `logstash` base pattern, so the logs profile resolves but
  // the mapping has no `log.level` at all. A `logs-*-*` data stream could not do this: the Fleet
  // template maps `log.level` whether or not any document sets it, and the row indicator keys off
  // the field's presence in the schema.
  NO_LOG_LEVEL_INDEX: 'logstash-synth-nolevel',
  NO_LOG_LEVEL_DATA_VIEW: 'logstash-synth-nolevel*',
  NO_LOG_LEVEL_ESQL_QUERY: 'from logstash-synth-nolevel* | sort @timestamp desc',

  SYNTH_FETCH_MORE_DATASET,
  SYNTH_FETCH_MORE_DATA_VIEW,
  /** Documents seeded into `synth.fetchmore`: above two sample sizes but below three. */
  SYNTH_FETCH_MORE_DOCUMENT_COUNT: 1260,
  /** Discover's default `sampleSize`, which is also the step each "Load more" adds. */
  DEFAULT_SAMPLE_SIZE: 500,

  LOG_LEVEL_FIELD: 'log.level',
  SERVICE_NAME_FIELD: 'service.name',

  // `log.level` is a keyword with `ignore_above: 1024`, so a longer value puts the document in
  // `_ignored` — which is what renders the quality-issue control and fills its accordion.
  OVERSIZED_LOG_LEVEL: 'x'.repeat(1025),
  // Short on purpose. `getStacktraceFields` only needs a non-empty `error.stack_trace`, and a value
  // long enough to be ignored itself would make the degraded-field count non-deterministic.
  STACK_TRACE: 'Error: synthetic failure\n    at handler (index.js:1:1)',

  JSON_TAB: 'doc_view_source',
  TABLE_TAB: 'doc_view_table',
  LOGS_OVERVIEW_TAB: 'doc_view_logs_overview',
  LOGS_OVERVIEW_HEADER: 'unifiedDocViewLogsOverviewHeader',
} as const;
