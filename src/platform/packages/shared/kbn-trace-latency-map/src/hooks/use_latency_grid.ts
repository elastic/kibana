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
  getMapQueryParts,
  getMapSampling,
} from '../query/latency_map_query';
import { addTableToGrid, createEmptyGrid } from '../query/parse';
import type { LatencyGrid } from '../query/parse';
import { getTimeGrid } from '../query/time_grid';
import type { TimeGrid } from '../query/time_grid';

export interface LatencyGridState {
  isLoading: boolean;
  stats?: DurationStats;
  timeGrid?: TimeGrid;
  grid?: LatencyGrid;
  /** The dense part of the range was sampled; counts there are estimates. */
  sampled: boolean;
  isEmpty: boolean;
  error?: Error;
  /** The source of the map shown, once it finished loading. */
  loadedSource?: TraceSource;
}

const LOADING: LatencyGridState = { isLoading: true, sampled: false, isEmpty: false };

const isAbort = (error: unknown) => error instanceof Error && error.name === 'AbortError';

/**
 * Loads the map of a source: the duration statistics of its range, which set the rows, then
 * the counts per cell. A range over the span budget is read in two parts, the failed and the
 * slowest spans exactly and the rest sampled. A new source cancels the load before it.
 */
export function useLatencyGrid({
  source,
  runEsql,
  targetBins,
}: {
  source: TraceSource;
  runEsql: RunEsql;
  targetBins: number;
}): LatencyGridState {
  // Keyed by content, so a host passing an equal source in a new object does not reload.
  const sourceKey = JSON.stringify(source);
  const stableSource = useMemo(() => JSON.parse(sourceKey) as TraceSource, [sourceKey]);
  const runEsqlRef = useRef(runEsql);
  runEsqlRef.current = runEsql;
  const [state, setState] = useState<LatencyGridState>(LOADING);

  useEffect(() => {
    const controller = new AbortController();
    const run = (query: string) => runEsqlRef.current(query, { signal: controller.signal });
    setState((previous) => ({ ...previous, isLoading: true, error: undefined }));

    (async () => {
      const stats = parseDurationStats(await run(buildDurationStatsQuery(stableSource)));
      const timeGrid = getTimeGrid(
        stableSource.timeRange.from,
        stableSource.timeRange.to,
        targetBins
      );
      if (!stats.spans) {
        return {
          isLoading: false,
          sampled: false,
          isEmpty: true,
          stats,
          timeGrid,
          loadedSource: stableSource,
        };
      }
      const sampling = getMapSampling(stats);
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
      return {
        isLoading: false,
        sampled: Boolean(sampling),
        isEmpty: grid.cells.size === 0,
        stats,
        timeGrid,
        grid,
        loadedSource: stableSource,
      };
    })().then(
      (next) => {
        if (!controller.signal.aborted) setState(next);
      },
      (error) => {
        if (controller.signal.aborted || isAbort(error)) return;
        setState({
          isLoading: false,
          sampled: false,
          isEmpty: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    );

    return () => controller.abort();
  }, [stableSource, targetBins]);

  return state;
}
