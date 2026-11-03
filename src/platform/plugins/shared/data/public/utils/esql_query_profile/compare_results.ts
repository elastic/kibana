/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** What is kept of a result set so two runs can be compared without holding every row. */
export interface QueryResultsSummary {
  columns: string[];
  rowCount: number;
  /** Fingerprint of the rows, ignoring their order. */
  rowsFingerprint: string;
  /** Fingerprint of the rows in the order they came back. */
  orderedFingerprint: string;
}

export type ResultsVerdict =
  | { kind: 'same'; rowCount: number; sameOrder: boolean }
  | { kind: 'differentColumns' }
  | { kind: 'differentRowCount'; baseline: number; current: number }
  | { kind: 'differentRows'; rowCount: number };

/** Numbers are rounded so a different summing order in a rewrite is not reported as a difference. */
const SIGNIFICANT_DIGITS = 9;

const normalizeValue = (value: unknown): string => {
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? String(Number(value.toPrecision(SIGNIFICANT_DIGITS)))
      : String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(normalizeValue).join(',')}]`;
  }
  return JSON.stringify(value) ?? 'null';
};

const MODULUS_A = 1_000_000_007;
const MODULUS_B = 998_244_353;

/**
 * A small non-cryptographic hash made of two polynomial hashes, enough to tell result sets apart.
 * Every product stays below 2^53, so plain number arithmetic is exact.
 */
const hash = (text: string): string => {
  let hashA = 7;
  let hashB = 11;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    hashA = (hashA * 31 + code) % MODULUS_A;
    hashB = (hashB * 131 + code) % MODULUS_B;
  }
  return `${hashA.toString(36)}-${hashB.toString(36)}-${text.length.toString(36)}`;
};

/** Summarizes the columns and values of an ES|QL response. */
export function summarizeResults(response: {
  columns?: Array<{ name?: string }>;
  values?: unknown[][];
}): QueryResultsSummary | undefined {
  if (!Array.isArray(response.columns) || !Array.isArray(response.values)) {
    return undefined;
  }

  const rows = response.values.map((row) => row.map(normalizeValue).join('\u001f'));
  return {
    columns: response.columns.map((column) => column.name ?? ''),
    rowCount: rows.length,
    rowsFingerprint: hash([...rows].sort().join('\u001e')),
    orderedFingerprint: hash(rows.join('\u001e')),
  };
}

/** Tells whether two runs returned the same results. Returns nothing when either is unknown. */
export function compareResults(
  baseline: QueryResultsSummary | undefined,
  current: QueryResultsSummary | undefined
): ResultsVerdict | undefined {
  if (!baseline || !current) {
    return undefined;
  }
  if (
    baseline.columns.length !== current.columns.length ||
    baseline.columns.some((name, index) => name !== current.columns[index])
  ) {
    return { kind: 'differentColumns' };
  }
  if (baseline.rowCount !== current.rowCount) {
    return { kind: 'differentRowCount', baseline: baseline.rowCount, current: current.rowCount };
  }
  if (baseline.rowsFingerprint !== current.rowsFingerprint) {
    return { kind: 'differentRows', rowCount: current.rowCount };
  }
  return {
    kind: 'same',
    rowCount: current.rowCount,
    sameOrder: baseline.orderedFingerprint === current.orderedFingerprint,
  };
}
