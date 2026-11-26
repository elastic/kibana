/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Sha256 } from '@kbn/crypto-browser';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { QueryResultsSummary } from './types';

/**
 * Decimals are rounded so a different summing order in a rewrite is not reported as a difference.
 * Integers are kept as they are, because rounding them would make large ids and timestamps equal.
 */
const SIGNIFICANT_DIGITS = 9;

/**
 * Above this many cells, the rows are not fingerprinted: it would take long enough to freeze the
 * page, and hold much text. Such a result is compared by its columns and row count.
 */
export const MAX_FINGERPRINTED_CELLS = 500_000;

const roundDecimals = (_key: string, value: unknown): unknown =>
  typeof value === 'number' && Number.isFinite(value) && !Number.isInteger(value)
    ? Number(value.toPrecision(SIGNIFICANT_DIGITS))
    : value;

/** A cell as text that is the same for the same value, including the values inside a multivalued one. */
const normalizeValue = (value: unknown): string => JSON.stringify(value, roundDecimals) ?? 'null';

const hash = (text: string): string => new Sha256().update(text, 'utf8').digest('hex');

/** Summarizes the columns and values of an ES|QL response. */
export function summarizeResults(
  response: Partial<Pick<ESQLSearchResponse, 'columns' | 'values'>>
): QueryResultsSummary | undefined {
  const { columns, values } = response;
  if (!Array.isArray(columns) || !Array.isArray(values)) {
    return undefined;
  }

  const summary: QueryResultsSummary = {
    columns: columns.map(({ name, type }) => ({ name, type })),
    rowCount: values.length,
  };
  if (values.length * columns.length > MAX_FINGERPRINTED_CELLS) {
    return summary;
  }

  // Each row is hashed once, and the fingerprints are made of the short hashes of the rows.
  const rowHashes = values.map((row) => hash(row.map(normalizeValue).join('\u001f')));
  return {
    ...summary,
    fingerprints: {
      unordered: hash([...rowHashes].sort().join('')),
      ordered: hash(rowHashes.join('')),
    },
  };
}
