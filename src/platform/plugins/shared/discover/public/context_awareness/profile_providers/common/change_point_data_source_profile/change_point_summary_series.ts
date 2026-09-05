/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { buildChangePointCards, type ChangePointCardModel } from '@kbn/change-point-chart-viewer';
import type { UnifiedChangePointGridProps } from '@kbn/change-point-chart-viewer';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getTime } from '@kbn/data-plugin/public';
import {
  buildChangePointLineDataQuery,
  fixESQLQueryWithVariables,
  getChangePointSeriesColumns,
  getNamedParams,
} from '@kbn/esql-utils';
import { isOfAggregateQueryType, buildEsQuery } from '@kbn/es-query';
import { Observable, of } from 'rxjs';

import { downsampleSparklinePoints } from './downsample_sparkline_points';
import {
  appendDistinctEntityWhereToLineEsql,
  esqlResponseToRows,
  getEarliestAnnotationTimeFromCards,
  getEntityColumnIds,
  getSummarySeriesTimeRange,
  partitionLineRows,
  type ChangePointSeriesByEntity,
} from './change_point_summary_series_helpers';

type ChangePointFetchParams = UnifiedChangePointGridProps['fetchParams'];

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

type SeriesCacheEntry =
  | { kind: 'in-flight'; observable: Observable<ChangePointSummarySeriesState> }
  | { kind: 'done'; state: ChangePointSummarySeriesState };

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
    JSON.stringify(fetchParams.esqlVariables ?? []),
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

const downsampleSeriesByEntity = (
  seriesByEntity: ChangePointSeriesByEntity
): ChangePointSeriesByEntity =>
  new Map([...seriesByEntity].map(([key, points]) => [key, downsampleSparklinePoints(points)]));

/**
 * Loads the pre-CHANGE_POINT line series (same ES|QL Lens uses).
 * Delete when a dedicated change-point command returns series in the response.
 */
const loadLineSeries = async ({
  fetchParams,
  data,
  seriesColumns,
  baseLineEsql,
  entityColumnIds,
  abortSignal,
  cards,
}: {
  fetchParams: ChangePointFetchParams;
  data: DataPublicPluginStart;
  seriesColumns: { timeColumn: string; valueColumn: string } | undefined;
  baseLineEsql: string | undefined;
  entityColumnIds: string[];
  abortSignal: AbortSignal;
  cards: ChangePointCardModel[] | undefined;
}): Promise<ChangePointSummarySeriesState> => {
  const table = fetchParams.table;
  if (!seriesColumns || !baseLineEsql || !table?.columns?.length) {
    return { status: 'idle' };
  }

  const { timeColumn, valueColumn } = seriesColumns;
  const earliestAnnotationMs = getEarliestAnnotationTimeFromCards(cards);

  let lineEsql = baseLineEsql;

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

  const query = `${lineEsql} | LIMIT ${LINE_SERIES_LIMIT}`;
  const namedParams = getNamedParams(query, timeRange, fetchParams.esqlVariables);
  const { rawResponse } = await data.search.esql(
    {
      query,
      ...(filter ? { filter } : {}),
      ...(namedParams.length ? { params: namedParams } : {}),
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
    seriesByEntity: downsampleSeriesByEntity(
      partitionLineRows(rows, timeColumn, valueColumn, entityColumnIds)
    ),
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

  const rawEsql = getEsqlQuery(fetchParams.query);
  const esql = rawEsql
    ? fixESQLQueryWithVariables(rawEsql, fetchParams.esqlVariables ?? [])
    : undefined;
  const table = fetchParams.table;
  const cards = esql && table?.columns?.length ? buildChangePointCards({ table, esql }) : undefined;
  const entityColumnIds = esql && table?.columns?.length ? getEntityColumnIds(esql, table) : [];
  const seriesColumns = esql ? getChangePointSeriesColumns(esql) : undefined;
  const baseLineEsql = esql ? buildChangePointLineDataQuery(esql) : undefined;

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
    seriesColumns,
    baseLineEsql,
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
