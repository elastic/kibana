/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { chunk } from 'lodash';
import {
  appendToESQLQuery,
  convertTimeseriesCommandToFrom,
  formatEsqlIdentifier,
} from '@kbn/esql-utils';
import type { IEsqlSearchResult } from '@kbn/search-types';

// Same request batch size as Data Visualizer's ES|QL count/cardinality collection.
const FIELDS_PER_REQUEST = 30;
// One expected row plus a sentinel, with an explicit limit to avoid ES's default-limit warning.
const STATS_RESPONSE_LIMIT = 2;

interface FieldStats {
  readonly count: number;
  readonly cardinality: number;
  readonly total: number;
}

type Execute = (query: string) => Promise<{ rawResponse: IEsqlSearchResult['rawResponse'] }>;

/** Collects full-query field statistics, leaving failed checks to the existing group collector. */
export const getActivityGroupFieldStats = async ({
  query,
  fields,
  minimumTotal,
  execute,
  signal,
}: {
  query: string;
  fields: readonly { readonly name: string }[];
  minimumTotal: number;
  execute: Execute;
  signal: AbortSignal;
}): Promise<ReadonlyMap<string, FieldStats>> => {
  const result = new Map<string, FieldStats>();
  let prefix = '__discover_activity_field_stats';
  while (fields.some(({ name }) => name.startsWith(prefix))) prefix += '_';
  const totalColumn = `${prefix}_total`;
  const baseQuery = convertTimeseriesCommandToFrom(query);

  for (const batch of chunk(fields, FIELDS_PER_REQUEST)) {
    signal.throwIfAborted();
    const expressions = [`${totalColumn} = COUNT(*)`];
    const aliases = batch.map(({ name }, index) => {
      const countColumn = `${prefix}_${index}_count`;
      const cardinalityColumn = `${prefix}_${index}_cardinality`;
      const field = formatEsqlIdentifier(name);
      // Count rows with a value, not individual members of multivalued fields.
      expressions.push(`${countColumn} = COUNT(MV_MIN(${field}))`);
      expressions.push(`${cardinalityColumn} = COUNT_DISTINCT(${field})`);
      return { name, countColumn, cardinalityColumn };
    });

    try {
      // No sampling LIMIT: retain the user's pipeline, including any existing LIMIT.
      const statsQuery = appendToESQLQuery(baseQuery, `| STATS ${expressions.join(', ')}`);
      const { rawResponse } = await execute(
        appendToESQLQuery(statsQuery, `| LIMIT ${STATS_RESPONSE_LIMIT}`)
      );
      signal.throwIfAborted();
      if (rawResponse.values.length !== 1) continue;
      const row = rawResponse.values[0];
      const total = row[rawResponse.columns.findIndex(({ name }) => name === totalColumn)];
      if (
        typeof total !== 'number' ||
        !Number.isSafeInteger(total) ||
        total < minimumTotal ||
        total <= 0
      ) {
        continue;
      }
      for (const { name, countColumn, cardinalityColumn } of aliases) {
        const count = row[rawResponse.columns.findIndex((column) => column.name === countColumn)];
        const cardinality =
          row[rawResponse.columns.findIndex((column) => column.name === cardinalityColumn)];
        if (
          typeof count !== 'number' ||
          !Number.isSafeInteger(count) ||
          count < 0 ||
          count > total ||
          typeof cardinality !== 'number' ||
          !Number.isSafeInteger(cardinality) ||
          cardinality < 0 ||
          (count === 0) !== (cardinality === 0)
        ) {
          continue;
        }
        result.set(name, { count, cardinality, total });
      }
    } catch {
      signal.throwIfAborted();
      // A failed optimization must not exclude a field from the normal collection.
    }
  }
  signal.throwIfAborted();
  return result;
};

/** Confirms the group limit with distinct values, including null, rather than a cardinality estimate. */
export const exceedsActivityGroupLimit = async ({
  query,
  field,
  maxGroups,
  execute,
  signal,
}: {
  query: string;
  field: { readonly name: string; readonly type: string };
  maxGroups: number;
  execute: Execute;
  signal: AbortSignal;
}): Promise<boolean> => {
  signal.throwIfAborted();
  try {
    const { rawResponse } = await execute(
      appendToESQLQuery(
        appendToESQLQuery(
          convertTimeseriesCommandToFrom(query),
          `| STATS BY ${formatEsqlIdentifier(field.name)}`
        ),
        `| LIMIT ${maxGroups + 1}`
      )
    );
    signal.throwIfAborted();
    const { columns, values } = rawResponse;
    return (
      columns.length === 1 &&
      columns[0].name === field.name &&
      columns[0].type === field.type &&
      values.length === maxGroups + 1 &&
      values.every(
        (row) =>
          row.length === 1 &&
          (row[0] === null || typeof row[0] === (field.type === 'boolean' ? 'boolean' : 'string'))
      ) &&
      new Set(values.map(([value]) => value)).size > maxGroups
    );
  } catch {
    signal.throwIfAborted();
    return false;
  }
};
