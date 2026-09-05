/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  formatAnnotationTimestamp,
  getEntityKey,
  type ChangePointCardModel,
} from '@kbn/change-point-chart-viewer';
import { formatEsqlIdentifier, formatEsqlLiteral, getChangePointByColumns } from '@kbn/esql-utils';
import type { TimeRange } from '@kbn/es-query';
import type { Datatable } from '@kbn/expressions-plugin/common';

export interface ChangePointSeriesPoint {
  /** Epoch milliseconds. */
  x: number;
  y: number;
}

/** Entity key → series points. Empty-string key is the single no-BY series. */
export type ChangePointSeriesByEntity = Map<string, ChangePointSeriesPoint[]>;

export const ENTITY_WHERE_PREDICATE_CAP = 200;

/** BY columns that actually appear on the result table (used as series split keys). */
export const getEntityColumnIds = (
  esql: string | undefined,
  table: Pick<Datatable, 'columns'>
): string[] => {
  const byColumns = getChangePointByColumns(esql);
  if (!byColumns?.length) return [];
  const columnIds = new Set(table.columns.map((c) => c.id));
  return byColumns.filter((id) => columnIds.has(id));
};

const toEpochMs = (value: unknown): number | undefined => {
  const iso = formatAnnotationTimestamp(value);
  if (!iso) return undefined;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? undefined : ms;
};

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

/** Earliest valid annotation datetime across cards (epoch ms). */
export const getEarliestAnnotationTimeFromCards = (
  cards: ChangePointCardModel[] | undefined
): number | undefined => {
  if (!cards?.length) return undefined;

  let earliest: number | undefined;
  for (const card of cards) {
    for (const event of card.annotationEvents) {
      const ms = Date.parse(event.datetime);
      if (Number.isNaN(ms)) continue;
      earliest = earliest === undefined ? ms : Math.min(earliest, ms);
    }
  }
  return earliest;
};

/** Pull Discover's time range back if a change point sits before `from` (same idea as Lens). */
export const getSummarySeriesTimeRange = (
  timeRange: TimeRange,
  earliestAnnotationMs?: number
): TimeRange => {
  if (earliestAnnotationMs === undefined) return timeRange;
  const fromMs = Date.parse(timeRange.from);
  if (Number.isNaN(fromMs) || earliestAnnotationMs >= fromMs) return timeRange;
  return { from: new Date(earliestAnnotationMs).toISOString(), to: timeRange.to };
};

/** Group rows into per-entity time series, sorted by time. */
export const partitionLineRows = (
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>,
  timeColumn: string,
  valueColumn: string,
  entityColumnIds: readonly string[]
): ChangePointSeriesByEntity => {
  const seriesByEntity: ChangePointSeriesByEntity = new Map();

  for (const row of rows) {
    const x = toEpochMs(row[timeColumn]);
    const y = toFiniteNumber(row[valueColumn]);
    if (x === undefined || y === undefined) continue;

    const key = getEntityKey(row, entityColumnIds);
    const existing = seriesByEntity.get(key);
    if (existing) {
      existing.push({ x, y });
    } else {
      seriesByEntity.set(key, [{ x, y }]);
    }
  }

  for (const points of seriesByEntity.values()) {
    points.sort((a, b) => a.x - b.x);
  }

  return seriesByEntity;
};

export const esqlResponseToRows = (rawResponse: {
  columns?: Array<{ name?: string }>;
  values?: unknown[][];
}): Array<Record<string, unknown>> => {
  const columnNames = (rawResponse.columns ?? [])
    .map((c) => c.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
  return (rawResponse.values ?? []).map((values) => {
    const row: Record<string, unknown> = {};
    for (let i = 0; i < columnNames.length; i++) {
      row[columnNames[i]] = values[i];
    }
    return row;
  });
};

/**
 * Narrows the line query to distinct entity tuples on the Discover table.
 * Returns the original query when the distinct set exceeds {@link ENTITY_WHERE_PREDICATE_CAP}.
 */
export const appendDistinctEntityWhereToLineEsql = (
  lineEsql: string,
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>,
  entityColumnIds: readonly string[],
  cap: number = ENTITY_WHERE_PREDICATE_CAP
): string => {
  if (!entityColumnIds.length) return lineEsql;

  const seen = new Set<string>();
  const groups: string[] = [];

  for (const row of rows) {
    const predicates: string[] = [];
    let skip = false;
    for (const col of entityColumnIds) {
      const lit = formatEsqlLiteral(row[col]);
      if (lit === undefined) {
        skip = true;
        break;
      }
      predicates.push(`${formatEsqlIdentifier(col)} == ${lit}`);
    }
    if (skip) continue;

    const key = predicates.join(' AND ');
    if (seen.has(key)) continue;
    if (seen.size >= cap) {
      return lineEsql;
    }
    seen.add(key);
    groups.push(entityColumnIds.length > 1 ? `(${key})` : key);
  }

  if (!groups.length) return lineEsql;
  return `${lineEsql} | WHERE ${groups.join(' OR ')}`;
};
