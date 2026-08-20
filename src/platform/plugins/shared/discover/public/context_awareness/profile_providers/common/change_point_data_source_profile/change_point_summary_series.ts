/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import {
  buildChangePointCards,
  formatAnnotationTimestamp,
  getEntityKey,
  isChangePointTableRow,
  type ChangePointCardModel,
} from '@kbn/change-point-chart-viewer';
import type { UnifiedChangePointGridProps } from '@kbn/change-point-chart-viewer';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getTime } from '@kbn/data-plugin/public';
import {
  buildChangePointLineDataQuery,
  formatEsqlIdentifier,
  formatEsqlLiteral,
  getChangePointByColumns,
  getChangePointOutputColumnNames,
  getChangePointSeriesColumns,
} from '@kbn/esql-utils';
import type { TimeRange } from '@kbn/es-query';
import { isOfAggregateQueryType, buildEsQuery } from '@kbn/es-query';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { Observable, of } from 'rxjs';

import { downsampleSparklinePoints } from './downsample_sparkline_points';

type ChangePointFetchParams = UnifiedChangePointGridProps['fetchParams'];

export interface ChangePointSeriesPoint {
  /** Epoch milliseconds. */
  x: number;
  y: number;
}

/** Entity key → series points. Empty-string key is the single no-BY series. */
export type ChangePointSeriesByEntity = Map<string, ChangePointSeriesPoint[]>;

export type ChangePointSummarySeriesState =
  | { status: 'idle' }
  | {
      status: 'loading';
      cards: ChangePointCardModel[] | undefined;
    }
  | {
      status: 'ready';
      seriesByEntity: ChangePointSeriesByEntity;
      entityColumnIds: string[];
      timeColumn: string;
      valueColumn: string;
      cards: ChangePointCardModel[] | undefined;
    }
  | {
      status: 'error';
      error: Error;
      entityColumnIds: string[];
      cards: ChangePointCardModel[] | undefined;
    };

const LINE_SERIES_LIMIT = 10000;
const MAX_DONE_SERIES_CACHE = 8;
export const ENTITY_WHERE_PREDICATE_CAP = 200;

type SeriesCacheEntry =
  | { kind: 'in-flight'; observable: Observable<ChangePointSummarySeriesState> }
  | { kind: 'done'; state: ChangePointSummarySeriesState };

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

/** Earliest change-point time in the table (epoch ms). */
export const getEarliestAnnotationTime = (
  table: Datatable,
  timeColumn: string,
  esql: string
): number | undefined => {
  const outputNames = getChangePointOutputColumnNames(esql);
  const typeColumnId = outputNames?.typeColumn ?? 'type';
  const pvalueColumnId = outputNames?.pvalueColumn ?? 'pvalue';
  const columnIds = new Set(table.columns.map((c) => c.id));
  // No type/pvalue columns => every row is a change-point event (common BY shape).
  const hasTypedColumns = columnIds.has(typeColumnId) && columnIds.has(pvalueColumnId);

  let earliest: number | undefined;
  for (const row of table.rows as Array<Record<string, unknown>>) {
    const isAnnotation = hasTypedColumns
      ? isChangePointTableRow(row, typeColumnId, pvalueColumnId)
      : true;
    if (!isAnnotation) continue;
    const ms = toEpochMs(row[timeColumn]);
    if (ms === undefined) continue;
    earliest = earliest === undefined ? ms : Math.min(earliest, ms);
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

  for (const [key, points] of seriesByEntity) {
    points.sort((a, b) => a.x - b.x);
    seriesByEntity.set(key, downsampleSparklinePoints(points));
  }

  return seriesByEntity;
};

const getEsqlQuery = (query: ChangePointFetchParams['query']): string | undefined =>
  isOfAggregateQueryType(query) ? query.esql : undefined;

export const getSeriesCacheKey = (fetchParams: ChangePointFetchParams): string => {
  const table = fetchParams.table;
  const columnIds = table?.columns.map((c) => c.id).join(',') ?? '';
  const rowCount = table?.rows.length ?? 0;
  return [
    fetchParams.searchSessionId ?? '',
    String(fetchParams.lastReloadRequestTime),
    getEsqlQuery(fetchParams.query) ?? '',
    fetchParams.timeRange?.from ?? '',
    fetchParams.timeRange?.to ?? '',
    JSON.stringify(fetchParams.filters ?? []),
    columnIds,
    String(rowCount),
  ].join('\0');
};

// One shared series load per Discover refetch; many Summary cells reuse it.
const seriesCache = new Map<string, SeriesCacheEntry>();

/** Clears the shared series cache (tests only). */
export const clearChangePointSummarySeriesCache = (): void => {
  seriesCache.clear();
};

const evictOldestDoneEntries = (keepKey: string): void => {
  if (seriesCache.size <= MAX_DONE_SERIES_CACHE) return;
  for (const [key, entry] of seriesCache) {
    if (seriesCache.size <= MAX_DONE_SERIES_CACHE) break;
    if (key !== keepKey && entry.kind === 'done') {
      seriesCache.delete(key);
    }
  }
};

const esqlResponseToRows = (rawResponse: {
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

/**
 * Loads the pre-CHANGE_POINT line series (same ES|QL Lens uses).
 * Delete when a dedicated change-point command returns series in the response.
 */
const loadLineSeries = async ({
  fetchParams,
  data,
  esql,
  entityColumnIds,
  abortSignal,
  cards,
}: {
  fetchParams: ChangePointFetchParams;
  data: DataPublicPluginStart;
  esql: string | undefined;
  entityColumnIds: string[];
  abortSignal: AbortSignal;
  cards: ChangePointCardModel[] | undefined;
}): Promise<ChangePointSummarySeriesState> => {
  const table = fetchParams.table;
  if (!esql || !table?.columns?.length) {
    return { status: 'idle' };
  }

  const seriesColumns = getChangePointSeriesColumns(esql);
  if (!seriesColumns) {
    return { status: 'idle' };
  }

  const { timeColumn, valueColumn } = seriesColumns;
  const earliestAnnotationMs = getEarliestAnnotationTime(table, timeColumn, esql);

  let lineEsql = buildChangePointLineDataQuery(esql);
  if (!lineEsql) {
    return {
      status: 'error',
      error: new Error('Unable to build change point line query'),
      entityColumnIds,
      cards,
    };
  }

  if (entityColumnIds.length > 0 && table.rows) {
    lineEsql = appendDistinctEntityWhereToLineEsql(
      lineEsql,
      table.rows as Array<Record<string, unknown>>,
      entityColumnIds
    );
  }

  const timeRange = getSummarySeriesTimeRange(fetchParams.timeRange, earliestAnnotationMs);
  const timeFilter = getTime(fetchParams.dataView, timeRange);
  let filter: ReturnType<typeof buildEsQuery> | undefined;
  try {
    filter = buildEsQuery(
      fetchParams.dataView,
      [],
      [...(fetchParams.filters ?? []), ...(timeFilter ? [timeFilter] : [])]
    );
  } catch {
    filter = undefined;
  }

  const { rawResponse } = await data.search.esql(
    {
      query: `${lineEsql} | LIMIT ${LINE_SERIES_LIMIT}`,
      ...(filter ? { filter } : {}),
    },
    {
      abortSignal,
      sessionId: fetchParams.searchSessionId,
      dropNullColumns: true,
      executionContext: {
        type: 'discover',
        name: 'change_point_summary_series',
      },
    }
  );

  const rows = esqlResponseToRows(rawResponse);
  return {
    status: 'ready',
    seriesByEntity: partitionLineRows(rows, timeColumn, valueColumn, entityColumnIds),
    entityColumnIds,
    timeColumn,
    valueColumn,
    cards,
  };
};

const isAbortError = (err: unknown): boolean =>
  (err instanceof DOMException && err.name === 'AbortError') ||
  (err instanceof Error && err.name === 'AbortError');

/**
 * Shared series stream for Summary cells.
 * N cells subscribe. At most, one line ES|QL fetch runs per Discover refetch.
 */
export const getChangePointSummarySeries$ = (
  fetchParams: ChangePointFetchParams,
  data: DataPublicPluginStart
): Observable<ChangePointSummarySeriesState> => {
  const cacheKey = getSeriesCacheKey(fetchParams);
  const cached = seriesCache.get(cacheKey);
  if (cached?.kind === 'done') {
    return of(cached.state);
  }
  if (cached?.kind === 'in-flight') {
    return cached.observable;
  }

  const esql = getEsqlQuery(fetchParams.query);
  const table = fetchParams.table;
  const entityColumnIds = esql && table?.columns?.length ? getEntityColumnIds(esql, table) : [];
  const cards = esql && table?.columns?.length ? buildChangePointCards({ table, esql }) : undefined;

  const abortController = new AbortController();
  const subscribers = new Set<{
    next: (value: ChangePointSummarySeriesState) => void;
    complete: () => void;
  }>();
  let current: ChangePointSummarySeriesState = {
    status: 'loading',
    cards,
  };

  const finish = (state: ChangePointSummarySeriesState): void => {
    current = state;
    seriesCache.set(cacheKey, { kind: 'done', state });
    evictOldestDoneEntries(cacheKey);
    for (const subscriber of subscribers) {
      subscriber.next(state);
      subscriber.complete();
    }
  };

  const observable = new Observable<ChangePointSummarySeriesState>((subscriber) => {
    subscribers.add(subscriber);
    subscriber.next(current);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && seriesCache.get(cacheKey)?.kind === 'in-flight') {
        abortController.abort();
        seriesCache.delete(cacheKey);
      }
    };
  });

  seriesCache.set(cacheKey, { kind: 'in-flight', observable });

  loadLineSeries({
    fetchParams,
    data,
    esql,
    entityColumnIds,
    abortSignal: abortController.signal,
    cards,
  })
    .then((state) => {
      if (abortController.signal.aborted) return;
      finish(state);
    })
    .catch((err) => {
      if (abortController.signal.aborted || isAbortError(err)) {
        return;
      }
      finish({
        status: 'error',
        error: err instanceof Error ? err : new Error(String(err)),
        entityColumnIds,
        cards,
      });
    });

  return observable;
};

/** Hook for Summary cells to read the shared series map. */
export const useChangePointSummarySeries = (
  fetchParams: ChangePointFetchParams | undefined,
  data: DataPublicPluginStart | undefined
): ChangePointSummarySeriesState => {
  const [state, setState] = useState<ChangePointSummarySeriesState>({ status: 'idle' });

  useEffect(() => {
    if (!fetchParams || !data) {
      setState({ status: 'idle' });
      return;
    }

    const subscription = getChangePointSummarySeries$(fetchParams, data).subscribe(setState);
    return () => subscription.unsubscribe();
  }, [fetchParams, data]);

  return state;
};
