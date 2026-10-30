/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Declared here, not imported from `@kbn/discover-utils`: its index pulls React hooks and
// utilities into what must stay a dependency-free query layer.
const TRANSACTION_DURATION_FIELD = 'transaction.duration.us';
const SPAN_DURATION_FIELD = 'span.duration.us';
/** OTel span duration, in nanoseconds. */
const OTEL_DURATION = 'duration';
const EVENT_OUTCOME_FIELD = 'event.outcome';
const OTEL_STATUS_CODE = 'status.code';

/** Classic APM data streams, legacy APM indices, and OTel-native traces. */
export const TRACES_INDEX_PATTERN = 'traces-apm*, apm-*, traces-*.otel-*';

/** Fields whose absence marks a root span, in classic APM and in OTel. */
export const PARENT_ID_FIELDS = ['parent.id', 'parent_span_id'];

/** Columns the map queries compute, from the raw fields below. */
export const DURATION_US_COLUMN = 'duration_us';
export const IS_FAILED_COLUMN = 'is_failed';

/**
 * Normalized columns every map query reads:
 * - `duration_us`: transaction.duration.us, span.duration.us, or OTel `duration` (ns), in µs
 * - `is_failed`: event.outcome == "failure", or OTel status.code == "Error"
 *
 * Durations are doubles: dividing OTel's long nanoseconds by 1000 as longs truncates, which
 * turns every span under a microsecond into 0 and drops it. Each cast and the division are their
 * own EVAL, ahead of the COALESCE: ES|QL evaluates a COALESCE row by row where its first value is
 * null, and with a division or a comparison inside it everywhere, which is several times slower
 * on large ranges.
 */
export const NORMALIZE_COMMANDS = [
  `EVAL otel_duration_us = TO_DOUBLE(${OTEL_DURATION}) / 1000`,
  `EVAL transaction_duration_us = TO_DOUBLE(${TRANSACTION_DURATION_FIELD})`,
  `EVAL span_duration_us = TO_DOUBLE(${SPAN_DURATION_FIELD})`,
  `EVAL ${DURATION_US_COLUMN} = COALESCE(transaction_duration_us, span_duration_us, otel_duration_us)`,
  `EVAL ${IS_FAILED_COLUMN} = COALESCE((${EVENT_OUTCOME_FIELD} IS NOT NULL AND ${EVENT_OUTCOME_FIELD} == "failure") OR (${OTEL_STATUS_CODE} IS NOT NULL AND ${OTEL_STATUS_CODE} == "Error"), false)`,
];

/** A failed span, over raw fields, so Elasticsearch filters it with its index. */
export const FAILED_SPAN_CONDITION = `(${EVENT_OUTCOME_FIELD} == "failure" OR ${OTEL_STATUS_CODE} == "Error")`;

/** A root span, over raw fields, so Elasticsearch filters it with its index. */
export const ROOT_SPAN_CONDITION = PARENT_ID_FIELDS.map((field) => `${field} IS NULL`).join(
  ' AND '
);

const DURATION_FAMILIES = [
  { field: TRANSACTION_DURATION_FIELD, perUs: 1 },
  { field: SPAN_DURATION_FIELD, perUs: 1 },
  // OTel `duration` is in nanoseconds.
  { field: OTEL_DURATION, perUs: 1000 },
];

/** A span that did not fail, over raw fields. Null-safe: a span without outcome did not fail. */
export const NOT_FAILED_CONDITION = `(${EVENT_OUTCOME_FIELD} IS NULL OR ${EVENT_OUTCOME_FIELD} != "failure") AND (${OTEL_STATUS_CODE} IS NULL OR ${OTEL_STATUS_CODE} != "Error")`;

/** Spans lasting `us` or longer, over raw fields. A span has one family of duration fields. */
export const durationAtLeastCondition = (us: number) =>
  DURATION_FAMILIES.map(({ field, perUs }) => `${field} >= ${Math.ceil(us * perUs)}`).join(' OR ');

/** Spans lasting less than `us`, or without a duration. The complement of the above. */
export const durationBelowCondition = (us: number) =>
  DURATION_FAMILIES.map(
    ({ field, perUs }) => `(${field} IS NULL OR ${field} < ${Math.ceil(us * perUs)})`
  ).join(' AND ');

/**
 * Spans with a duration of at least `minUs` and below `maxUs`, over raw fields. A span has
 * the duration of one family only, so the families are alternatives.
 */
export const durationRangeCondition = (minUs: number, maxUs: number) =>
  DURATION_FAMILIES.map(
    ({ field, perUs }) =>
      `(${field} >= ${Math.ceil(minUs * perUs)} AND ${field} < ${Math.ceil(maxUs * perUs)})`
  ).join(' OR ');
