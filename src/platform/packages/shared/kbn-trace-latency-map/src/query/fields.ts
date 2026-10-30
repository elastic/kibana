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
export const DURATION_COLUMN = 'duration_ns';
export const IS_FAILED_COLUMN = 'is_failed';

/**
 * Normalized columns every map query reads:
 * - `duration_ns`: transaction.duration.us or span.duration.us (microseconds, times 1000), or OTel
 *   `duration` (nanoseconds), in nanoseconds
 * - `is_failed`: event.outcome == "failure", or OTel status.code == "Error"
 *
 * Nanoseconds are the unit of OTel, and a microsecond is just a thousand of them, so nothing is
 * lost, divided or truncated. Durations are doubles: each cast and the arithmetic are their own
 * EVAL, ahead of the COALESCE, because ES|QL evaluates a COALESCE row by row where its first value
 * is null, and with a division or a comparison inside it everywhere, which is several times slower
 * on large ranges.
 */
export const NORMALIZE_COMMANDS = [
  `EVAL otel_duration_ns = TO_DOUBLE(${OTEL_DURATION})`,
  `EVAL transaction_duration_ns = TO_DOUBLE(${TRANSACTION_DURATION_FIELD}) * 1000`,
  `EVAL span_duration_ns = TO_DOUBLE(${SPAN_DURATION_FIELD}) * 1000`,
  `EVAL ${DURATION_COLUMN} = COALESCE(transaction_duration_ns, span_duration_ns, otel_duration_ns)`,
  `EVAL ${IS_FAILED_COLUMN} = COALESCE((${EVENT_OUTCOME_FIELD} IS NOT NULL AND ${EVENT_OUTCOME_FIELD} == "failure") OR (${OTEL_STATUS_CODE} IS NOT NULL AND ${OTEL_STATUS_CODE} == "Error"), false)`,
];

/** A failed span, over raw fields, so Elasticsearch filters it with its index. */
export const FAILED_SPAN_CONDITION = `(${EVENT_OUTCOME_FIELD} == "failure" OR ${OTEL_STATUS_CODE} == "Error")`;

/** A root span, over raw fields, so Elasticsearch filters it with its index. */
export const ROOT_SPAN_CONDITION = PARENT_ID_FIELDS.map((field) => `${field} IS NULL`).join(
  ' AND '
);

/** The fields that hold a span's duration, each with how many nanoseconds one of its units is. */
const DURATION_FAMILIES = [
  { field: TRANSACTION_DURATION_FIELD, nsPerUnit: 1000 },
  { field: SPAN_DURATION_FIELD, nsPerUnit: 1000 },
  { field: OTEL_DURATION, nsPerUnit: 1 },
];

/**
 * A bound in nanoseconds as a whole number of a field's units, rounded up: for a whole number of
 * units `value >= bound` and `value * nsPerUnit >= bound` select the same spans, and `value < bound`
 * and `value * nsPerUnit < bound` do too. So the conditions select what the rows were binned on.
 */
const inUnits = (bound: number, nsPerUnit: number) => Math.ceil(bound / nsPerUnit);

/** A span that did not fail, over raw fields. Null-safe: a span without outcome did not fail. */
export const NOT_FAILED_CONDITION = `(${EVENT_OUTCOME_FIELD} IS NULL OR ${EVENT_OUTCOME_FIELD} != "failure") AND (${OTEL_STATUS_CODE} IS NULL OR ${OTEL_STATUS_CODE} != "Error")`;

/** Spans lasting `duration` (ns) or longer, over raw fields. A span has one family of duration fields. */
export const durationAtLeastCondition = (duration: number) =>
  DURATION_FAMILIES.map(
    ({ field, nsPerUnit }) => `${field} >= ${inUnits(duration, nsPerUnit)}`
  ).join(' OR ');

/** Spans lasting less than `duration` (ns), or without a duration. The complement of the above. */
export const durationBelowCondition = (duration: number) =>
  DURATION_FAMILIES.map(
    ({ field, nsPerUnit }) => `(${field} IS NULL OR ${field} < ${inUnits(duration, nsPerUnit)})`
  ).join(' AND ');

/**
 * Spans with a duration of at least `minDuration` and below `maxDuration` (ns), over raw fields. A
 * span has the duration of one family only, so the families are alternatives.
 */
export const durationRangeCondition = (minDuration: number, maxDuration: number) =>
  DURATION_FAMILIES.map(
    ({ field, nsPerUnit }) =>
      `(${field} >= ${inUnits(minDuration, nsPerUnit)} AND ${field} < ${inUnits(maxDuration, nsPerUnit)})`
  ).join(' OR ');
