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
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getTime } from '@kbn/data-plugin/public';
import {
  buildChangePointLineDataQuery,
  fixESQLQueryWithVariables,
  getChangePointSeriesColumns,
  getNamedParams,
} from '@kbn/esql-utils';
import { isOfAggregateQueryType, isOfQueryType, buildEsQuery } from '@kbn/es-query';
import { Observable, of } from 'rxjs';
import type { CellRenderersSearchContext } from '../../../types';

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

export type ChangePointSummaryFetchParams = CellRenderersSearchContext & {
  dataView: DataView;
};

export const SUMMARY_SERIES_STATUS = {
  IDLE: 'idle',
  UNAVAILABLE: 'unavailable',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
} as const;

export type ChangePointSummarySeriesState =
  | { status: typeof SUMMARY_SERIES_STATUS.IDLE }
  | { status: typeof SUMMARY_SERIES_STATUS.UNAVAILABLE }
  | {
      status: typeof SUMMARY_SERIES_STATUS.LOADING;
      cards: ChangePointCardModel[] | undefined;
    }
  | {
      status: typeof SUMMARY_SERIES_STATUS.READY;
      seriesByEntity: ChangePointSeriesByEntity;
      entityColumnIds: string[];
      timeColumn: string;
      valueColumn: string;
      cards: ChangePointCardModel[] | undefined;
    }
  | {
      status: typeof SUMMARY_SERIES_STATUS.ERROR;
      error: Error;
      entityColumnIds: string[];
      cards: ChangePointCardModel[] | undefined;
    };

const LINE_SERIES_LIMIT = 10000;

type SeriesCacheEntry =
  | { kind: 'in-flight'; observable: Observable<ChangePointSummarySeriesState> }
  | { kind: 'done'; state: ChangePointSummarySeriesState };

interface SeriesCacheSlot {
  key: string;
  entry: SeriesCacheEntry;
}

interface SeriesSubscriber {
  next: (value: ChangePointSummarySeriesState) => void;
  complete: () => void;
}

export interface ChangePointSummarySeriesCache {
  getSeries$: (
    fetchParams: ChangePointSummaryFetchParams,
    data: DataPublicPluginStart
  ) => Observable<ChangePointSummarySeriesState>;
}

const getEsqlQuery = (query: ChangePointSummaryFetchParams['query']): string | undefined =>
  isOfAggregateQueryType(query) ? query.esql : undefined;

export const getSeriesCacheKey = (fetchParams: ChangePointSummaryFetchParams): string => {
  const table = fetchParams.table;
  const columnIds = table?.columns.map((c) => c.id).join(',') ?? '';
  const rowCount = table?.rows.length ?? 0;
  return [
    fetchParams.searchSessionId ?? '',
    String(fetchParams.requestId ?? ''),
    getEsqlQuery(fetchParams.query) ?? '',
    JSON.stringify(fetchParams.filterQuery ?? null),
    fetchParams.timeRange?.from ?? '',
    fetchParams.timeRange?.to ?? '',
    JSON.stringify(fetchParams.filters ?? []),
    JSON.stringify(fetchParams.esqlVariables ?? []),
    fetchParams.projectRouting ?? '',
    String(fetchParams.isApproximate ?? ''),
    columnIds,
    String(rowCount),
  ].join('\0');
};

const downsampleSeriesByEntity = (
  seriesByEntity: ChangePointSeriesByEntity
): ChangePointSeriesByEntity =>
  new Map([...seriesByEntity].map(([key, points]) => [key, downsampleSparklinePoints(points)]));

const prepareSeriesQuery = (fetchParams: ChangePointSummaryFetchParams) => {
  const rawEsql = getEsqlQuery(fetchParams.query);
  const esql = rawEsql
    ? fixESQLQueryWithVariables(rawEsql, fetchParams.esqlVariables ?? [])
    : undefined;
  const table = fetchParams.table;

  return {
    cards: esql && table?.columns?.length ? buildChangePointCards({ table, esql }) : undefined,
    entityColumnIds: esql && table?.columns?.length ? getEntityColumnIds(esql, table) : [],
    seriesColumns: esql ? getChangePointSeriesColumns(esql) : undefined,
    baseLineEsql: esql ? buildChangePointLineDataQuery(esql) : undefined,
  };
};

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
  fetchParams: ChangePointSummaryFetchParams;
  data: DataPublicPluginStart;
  seriesColumns: { timeColumn: string; valueColumn: string } | undefined;
  baseLineEsql: string | undefined;
  entityColumnIds: string[];
  abortSignal: AbortSignal;
  cards: ChangePointCardModel[] | undefined;
}): Promise<ChangePointSummarySeriesState> => {
  const table = fetchParams.table;
  // Nothing to chart when the query has no line series or the table is empty.
  if (!seriesColumns || !baseLineEsql || !table?.columns?.length) {
    return { status: SUMMARY_SERIES_STATUS.UNAVAILABLE };
  }

  const { timeColumn, valueColumn } = seriesColumns;
  const earliestAnnotationMs = getEarliestAnnotationTimeFromCards(cards);

  let lineEsql = baseLineEsql;

  // BY queries only fetch the entities shown in the current table.
  if (entityColumnIds.length > 0 && table.rows) {
    lineEsql = appendDistinctEntityWhereToLineEsql(
      lineEsql,
      table.rows as Array<Record<string, unknown>>,
      entityColumnIds
    );
  }

  // Pull the range back when a change point sits before Discover's from so that it shows up.
  const timeRange = fetchParams.timeRange
    ? getSummarySeriesTimeRange(fetchParams.timeRange, earliestAnnotationMs)
    : undefined;
  const timeFilter = timeRange ? getTime(fetchParams.dataView, timeRange) : undefined;
  const queries =
    fetchParams.filterQuery && isOfQueryType(fetchParams.filterQuery)
      ? [fetchParams.filterQuery]
      : [];
  let filter: ReturnType<typeof buildEsQuery> | undefined;
  try {
    filter = buildEsQuery(fetchParams.dataView, queries, [
      ...(fetchParams.filters ?? []),
      ...(timeFilter ? [timeFilter] : []),
    ]);
  } catch {
    // A bad filter should not fail the sparkline.
    filter = undefined;
  }

  // Cap the line query so a wide range cannot return an unbounded series.
  const query = `${lineEsql} | LIMIT ${LINE_SERIES_LIMIT}`;
  // Named params fill in the time and control placeholders in the ES|QL.
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
      projectRouting: fetchParams.projectRouting,
      approximation: fetchParams.isApproximate,
      executionContext: {
        type: 'discover',
        name: 'change_point_summary_series',
      },
    }
  );

  const rows = esqlResponseToRows(rawResponse);
  // One point series per entity, thinned for the sparkline.
  return {
    status: SUMMARY_SERIES_STATUS.READY,
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
 * One series request shared by every Summary cell on this profile.
 * A parent search keeps that request alive when the grid unmounts.
 */
export const createChangePointSummarySeriesCache = (): ChangePointSummarySeriesCache => {
  // Replaced when the query changes, so only the latest request is kept.
  let currentEntry: SeriesCacheSlot | undefined;

  const getSeries$ = (
    fetchParams: ChangePointSummaryFetchParams,
    data: DataPublicPluginStart
  ): Observable<ChangePointSummarySeriesState> => {
    const cacheKey = getSeriesCacheKey(fetchParams);
    // Replay a finished result or join the request already in flight.
    if (currentEntry?.key === cacheKey) {
      return currentEntry.entry.kind === 'done'
        ? of(currentEntry.entry.state)
        : currentEntry.entry.observable;
    }

    const { cards, entityColumnIds, seriesColumns, baseLineEsql } = prepareSeriesQuery(fetchParams);

    // Used only when no parent search owns the request.
    const localAbortController = new AbortController();
    const abortSignal = fetchParams.abortSignal ?? localAbortController.signal;
    const subscribers = new Set<SeriesSubscriber>();
    const loadingState: ChangePointSummarySeriesState = {
      status: SUMMARY_SERIES_STATUS.LOADING,
      cards,
    };
    let isSettled = false;

    // A newer request may have replaced this one before it finishes.
    const isCurrentEntry = (): boolean =>
      currentEntry?.key === cacheKey &&
      currentEntry.entry.kind === 'in-flight' &&
      currentEntry.entry.observable === observable;

    // Search abort - drop the request and do not store a result.
    const cancelInFlight = (): void => {
      if (isSettled) return;
      isSettled = true;
      abortSignal.removeEventListener('abort', cancelInFlight);
      if (isCurrentEntry()) {
        currentEntry = undefined;
      }
      for (const subscriber of subscribers) {
        subscriber.complete();
      }
      subscribers.clear();
    };

    // Store a ready or error result so later cells can replay it.
    const settle = (state: ChangePointSummarySeriesState): void => {
      if (isSettled || abortSignal.aborted) return;
      isSettled = true;
      abortSignal.removeEventListener('abort', cancelInFlight);
      if (isCurrentEntry()) {
        currentEntry = { key: cacheKey, entry: { kind: 'done', state } };
      }
      for (const subscriber of subscribers) {
        subscriber.next(state);
        subscriber.complete();
      }
      subscribers.clear();
    };

    const observable = new Observable<ChangePointSummarySeriesState>((subscriber) => {
      if (isSettled) {
        subscriber.complete();
        return;
      }
      subscribers.add(subscriber);
      subscriber.next(loadingState);
      return () => {
        subscribers.delete(subscriber);
        // A parent-owned request keeps running after the last cell unmounts.
        if (!fetchParams.abortSignal && subscribers.size === 0 && isCurrentEntry()) {
          localAbortController.abort();
        }
      };
    });

    currentEntry = { key: cacheKey, entry: { kind: 'in-flight', observable } };
    // Parent search abort cancels the request even while no cells are mounted.
    abortSignal.addEventListener('abort', cancelInFlight, { once: true });

    if (abortSignal.aborted) {
      cancelInFlight();
      return observable;
    }

    loadLineSeries({
      fetchParams,
      data,
      seriesColumns,
      baseLineEsql,
      entityColumnIds,
      abortSignal,
      cards,
    })
      .then(settle)
      .catch((err) => {
        // Abort is already handled. Only a real failure is stored as an error.
        if (abortSignal.aborted || isAbortError(err)) return;
        settle({
          status: SUMMARY_SERIES_STATUS.ERROR,
          error: err instanceof Error ? err : new Error(String(err)),
          entityColumnIds,
          cards,
        });
      });

    return observable;
  };

  return { getSeries$ };
};

/** Hook for Summary cells to read the profile-scoped series cache. */
export const useChangePointSummarySeries = (
  fetchParams: ChangePointSummaryFetchParams | undefined,
  data: DataPublicPluginStart | undefined,
  cache: ChangePointSummarySeriesCache
): ChangePointSummarySeriesState => {
  const [state, setState] = useState<ChangePointSummarySeriesState>({
    status: SUMMARY_SERIES_STATUS.LOADING,
    cards: undefined,
  });

  useEffect(() => {
    if (!fetchParams || !data) {
      setState({ status: SUMMARY_SERIES_STATUS.IDLE });
      return;
    }

    const subscription = cache.getSeries$(fetchParams, data).subscribe(setState);
    return () => subscription.unsubscribe();
  }, [fetchParams, data, cache]);

  return state;
};
