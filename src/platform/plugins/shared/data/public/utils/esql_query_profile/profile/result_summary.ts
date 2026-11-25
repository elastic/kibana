/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Sha256 } from '@kbn/crypto-browser';
import type { QueryResultsSummary } from './types';

/**
 * Decimals are rounded so a different summing order in a rewrite is not reported as a difference.
 * Integers are kept as they are, because rounding them would make large ids and timestamps equal.
 */
const SIGNIFICANT_DIGITS = 9;

const roundDecimals = (_key: string, value: unknown): unknown =>
  typeof value === 'number' && Number.isFinite(value) && !Number.isInteger(value)
    ? Number(value.toPrecision(SIGNIFICANT_DIGITS))
    : value;

/** A cell as text that is the same for the same value, including the values inside a multivalued one. */
const normalizeValue = (value: unknown): string => JSON.stringify(value, roundDecimals) ?? 'null';

const hash = (text: string): string => new Sha256().update(text, 'utf8').digest('hex');

/** Summarizes the columns and values of an ES|QL response. */
export function summarizeResults(response: {
  columns?: Array<{ name?: string; type?: string }>;
  values?: unknown[][];
}): QueryResultsSummary | undefined {
  if (!Array.isArray(response.columns) || !Array.isArray(response.values)) {
    return undefined;
  }

  const rows = response.values.map((row) => row.map(normalizeValue).join('\u001f'));
  return {
    columns: response.columns.map((column) => ({
      name: column.name ?? '',
      type: column.type ?? '',
    })),
    rowCount: rows.length,
    rowsFingerprint: hash([...rows].sort().join('\u001e')),
    orderedFingerprint: hash(rows.join('\u001e')),
  };
}
