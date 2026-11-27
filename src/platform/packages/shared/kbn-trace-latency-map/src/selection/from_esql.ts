/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FAILED_SPAN_CONDITION } from '../query/fields';
import type { LatencyMapSelection } from '../types';

const FAILED_ONLY_SUFFIX = ` AND ${FAILED_SPAN_CONDITION}`;

/**
 * The exact shape of a plain condition `selectionToEsqlCondition` writes (no scope, no
 * per-trace clause), after the failed-spans suffix is taken off: the time window, then the
 * bounds of each duration family.
 */
const SELECTION_CONDITION_PATTERN =
  /^@timestamp >= TO_DATETIME\("([^"]+)"\) AND @timestamp < TO_DATETIME\("([^"]+)"\) AND \(\(transaction\.duration\.us >= (\d+) AND transaction\.duration\.us < (\d+)\) OR \(span\.duration\.us >= (\d+) AND span\.duration\.us < (\d+)\) OR \(duration >= (\d+) AND duration < (\d+)\)\)$/;

/** The written ISO timestamp, or undefined where the text is not one. */
const parseWrittenTimestamp = (text: string): string | undefined => {
  try {
    return new Date(text).toISOString() === text ? text : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The selection of a condition `selectionToEsqlCondition` wrote, for hosts that keep
 * the selection in a query and restore it from there (a reload, a shared URL).
 *
 * Only a condition that package function wrote parses: the shape must match exactly and the
 * three duration families must agree, so a hand-edited clause, a scoped or per-trace
 * condition, or any other filter returns `undefined` and stays an ordinary filter of the
 * host's query. The bounds come back from the OTel nanoseconds, which are the whole numbers the
 * writer rounded the committed cell edges up to: writing the result again gives the same condition.
 */
export function parseSelectionCondition(condition: string): LatencyMapSelection | undefined {
  const failedOnly = condition.endsWith(FAILED_ONLY_SUFFIX);
  const base = failedOnly ? condition.slice(0, -FAILED_ONLY_SUFFIX.length) : condition;
  const match = base.match(SELECTION_CONDITION_PATTERN);
  if (!match) return undefined;
  const [, fromText, toText, ...bounds] = match;
  const [txMin, txMax, spanMin, spanMax, nsMin, nsMax] = bounds.map(Number);
  const from = parseWrittenTimestamp(fromText);
  const to = parseWrittenTimestamp(toText);
  // The families all come from one range in nanoseconds: the microsecond bounds are those, rounded up.
  const familiesAgree =
    spanMin === txMin &&
    spanMax === txMax &&
    txMin === Math.ceil(nsMin / 1000) &&
    txMax === Math.ceil(nsMax / 1000);
  if (!from || !to || !familiesAgree) return undefined;
  return {
    from,
    to,
    minDuration: nsMin,
    maxDuration: nsMax,
    ...(failedOnly ? { failedOnly: true } : {}),
  };
}

/** Whether a clause is a selection condition this package wrote. */
export function isSelectionCondition(condition: string): boolean {
  return parseSelectionCondition(condition) !== undefined;
}
