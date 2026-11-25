/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DurationStats, RunEsql, TraceSource } from '../types';
import { parseDurationStats } from '../query/duration_rows';
import {
  buildDurationStatsQuery,
  buildLatencyGridQuery,
  buildOperationHistogramQuery,
  getMapQueryParts,
  getMapSampling,
} from '../query/latency_map_query';
import type { MapSampling } from '../query/latency_map_query';
import { addTableToGrid, createEmptyGrid } from '../query/parse';
import type { LatencyGrid } from '../query/parse';
import { getTimeGrid } from '../query/time_grid';
import type { TimeGrid } from '../query/time_grid';
import { parseOperationHistograms } from '../operations/operation_bands';
import type { OperationHistogram } from '../operations/operation_bands';
import { getGridCacheKey, gridCache, operationsCache, statsCache } from './latency_grid_cache';

export interface LatencyGridState {
  isLoading: boolean;
  stats?: DurationStats;
  timeGrid?: TimeGrid;
  grid?: LatencyGrid;
  /** How the dense part of the range was sampled; undefined when every span was read. */
  sampling?: MapSampling;
  /** Per-operation duration histograms, once loaded; [] when their query failed. */
  operations?: OperationHistogram[];
  isEmpty: boolean;
  error?: Error;
  /** The source of the map shown, once it finished loading. */
  loadedSource?: TraceSource;
}

const LOADING: LatencyGridState = { isLoading: true, isEmpty: false };

const isAbort = (error: unknown) => error instanceof Error && error.name === 'AbortError';

/**
 * The map of a source as it was loaded before, if it was: shown at once, without a query or
 * a loading state. With the histograms when they are wanted and were loaded; without them,
 * the bands join it once they load, as on a first load.
 */
const fromCache = (
  sourceKey: string,
  targetBins: number,
  loadOperations: boolean
): LatencyGridState | undefined => {
  const cached = gridCache.get(getGridCacheKey(sourceKey, targetBins));
  if (!cached) return undefined;
  const operations = loadOperations ? operationsCache.get(sourceKey) : undefined;
  return { isLoading: false, ...cached, ...(operations ? { operations } : {}) };
};

/**
 * Loads the map of a source: the duration statistics of its range, which set the rows, then
 * the counts per cell. A range over the span budget is read in two parts, the failed and the
 * slowest spans exactly and the rest sampled. A new source cancels the load before it. What
 * was loaded is kept for a while, by content: a map shown again (another tab of the host,
 * the view switched away and back, a resize returning to its columns) costs no query.
 */
export function useLatencyGrid({
  source,
  runEsql,
  targetBins,
  enabled = true,
  loadOperations = false,
}: {
  source: TraceSource;
  runEsql: RunEsql;
  targetBins: number;
  /** Loads nothing until true: a map that has not been measured has no columns to ask for. */
  enabled?: boolean;
  /** Also loads the per-operation duration histograms, for the duration bands. */
  loadOperations?: boolean;
}): LatencyGridState {
  // Keyed by content, so a host passing an equal source in a new object does not reload.
  const sourceKey = JSON.stringify(source);
  const stableSource = useMemo(() => JSON.parse(sourceKey) as TraceSource, [sourceKey]);
  const runEsqlRef = useRef(runEsql);
  runEsqlRef.current = runEsql;
  const [state, setState] = useState<LatencyGridState>(
    () => (enabled && fromCache(sourceKey, targetBins, loadOperations)) || LOADING
  );

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const run = (query: string) => runEsqlRef.current(query, { signal: controller.signal });
    const cached = fromCache(sourceKey, targetBins, loadOperations);
    // A map loaded before shows at once, and has nothing to load unless its histograms are
    // wanted and missing. Otherwise the map is loading - not the previous isEmpty: while a
    // new source loads, it is not empty.
    if (cached && (!loadOperations || cached.operations)) {
      setState(cached);
      return;
    }
    if (cached) setState(cached);
    else {
      setState((previous) => ({ ...previous, isLoading: true, isEmpty: false, error: undefined }));
    }

    (async () => {
      // The statistics of a source do not depend on the columns: a resize into another tier
      // reloads the grid with the stats it already has, not the percentiles again.
      const stats =
        cached?.stats ??
        statsCache.get(sourceKey) ??
        parseDurationStats(await run(buildDurationStatsQuery(stableSource)));
      // Nothing of a cancelled load reaches the cache: an older answer resolving after a
      // newer load of the same source must not overwrite it.
      const cacheable = () => !controller.signal.aborted;
      if (cacheable()) statsCache.set(sourceKey, stats);
      const timeGrid = getTimeGrid(
        stableSource.timeRange.from,
        stableSource.timeRange.to,
        targetBins
      );
      if (!stats.spans) {
        const empty = { isEmpty: true, stats, timeGrid, loadedSource: stableSource };
        if (cacheable()) gridCache.set(getGridCacheKey(sourceKey, targetBins), empty);
        return { isLoading: false, ...empty };
      }
      const sampling = getMapSampling(stats);
      // Started beside the grid queries - the histograms need only the statistics. On a
      // failure the map just loses its bands, and nothing is cached, so the next load
      // retries after a transient error; an aborted run is discarded with the rest.
      // Neither the histograms depend on the columns, which they have none of.
      const operationsPromise =
        loadOperations && !operationsCache.get(sourceKey)
          ? run(buildOperationHistogramQuery(stableSource, stats, sampling)).then(
              (table) => {
                const operations = parseOperationHistograms(
                  table,
                  sampling ? 1 / sampling.probability : 1
                );
                if (cacheable()) operationsCache.set(sourceKey, operations);
                return operations;
              },
              () => undefined
            )
          : undefined;
      let gridState: LatencyGridState;
      if (cached) {
        gridState = cached;
      } else {
        let grid = createEmptyGrid(timeGrid.bins);
        if (sampling) {
          const [exact, sampled] = getMapQueryParts(sampling);
          const tables = await Promise.all(
            [exact, sampled].map((part) =>
              run(buildLatencyGridQuery(stableSource, stats, timeGrid, part))
            )
          );
          grid = addTableToGrid(grid, tables[0]);
          grid = addTableToGrid(grid, tables[1], 1 / sampling.probability);
        } else {
          grid = addTableToGrid(
            grid,
            await run(buildLatencyGridQuery(stableSource, stats, timeGrid))
          );
        }
        const loaded = {
          sampling,
          isEmpty: grid.cells.size === 0,
          stats,
          timeGrid,
          grid,
          loadedSource: stableSource,
        };
        if (cacheable()) gridCache.set(getGridCacheKey(sourceKey, targetBins), loaded);
        gridState = { isLoading: false, ...loaded };
      }
      if (!loadOperations) return gridState;
      if (!operationsPromise) {
        return { ...gridState, operations: operationsCache.get(sourceKey) ?? [] };
      }
      // The map shows while the histograms finish; the bands join it when they arrive.
      if (!controller.signal.aborted) setState(gridState);
      return { ...gridState, operations: (await operationsPromise) ?? [] };
    })().then(
      (next) => {
        if (!controller.signal.aborted) setState(next);
      },
      (error) => {
        if (controller.signal.aborted || isAbort(error)) return;
        setState({
          isLoading: false,
          isEmpty: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    );

    return () => controller.abort();
  }, [sourceKey, stableSource, targetBins, enabled, loadOperations]);

  return state;
}
