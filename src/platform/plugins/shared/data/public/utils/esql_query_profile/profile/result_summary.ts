/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
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

type Results = Partial<Pick<ESQLSearchResponse, 'columns' | 'values'>>;

/** Whether the rows of a response are too many to fingerprint. */
const isTooLarge = ({ columns, values }: Results): boolean =>
  (columns?.length ?? 0) * (values?.length ?? 0) > MAX_FINGERPRINTED_CELLS;

/** Summarizes the columns and values of an ES|QL response. */
export function summarizeResults(response: Results): QueryResultsSummary | undefined {
  const { columns, values } = response;
  if (!Array.isArray(columns) || !Array.isArray(values)) {
    return undefined;
  }

  const summary: QueryResultsSummary = {
    columns: columns.map(({ name, type }) => ({ name, type })),
    rowCount: values.length,
  };
  if (isTooLarge(response)) {
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

/** A summary that is made at once, so that the rows are not held for it. */
const summarizeNow = (response: Results): (() => QueryResultsSummary | undefined) => {
  const summary = summarizeResults(response);
  return () => summary;
};

/** A summary that is made on the first call, which holds the rows until then. */
const summarizeLater = (response: Results): (() => QueryResultsSummary | undefined) =>
  once(() => summarizeResults(response));

/**
 * Gives a function that returns the summary of a response. A response with many rows is only
 * summarized by its columns and row count, which is quick, so it is done at once and the rows are
 * let go. Any other is summarized when first asked for, and only then pays for the fingerprints.
 */
export const readResultsOf = (response: Results): (() => QueryResultsSummary | undefined) =>
  isTooLarge(response) ? summarizeNow(response) : summarizeLater(response);
