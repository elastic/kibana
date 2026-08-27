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

  SYNTH_DOCVIEWER_DATASET,
  SYNTH_DOCVIEWER_DATA_VIEW,

  // `log.level` is a keyword with `ignore_above: 1024`, so a longer value puts the document in
  // `_ignored` — which is what renders the quality-issue control and fills its accordion.
  OVERSIZED_LOG_LEVEL: 'x'.repeat(1025),
  // Short on purpose. `getStacktraceFields` only needs a non-empty `error.stack_trace`, and a value
  // long enough to be ignored itself would make the degraded-field count non-deterministic.
  STACK_TRACE: 'Error: synthetic failure\n    at handler (index.js:1:1)',

  JSON_TAB: 'doc_view_source',
} as const;
