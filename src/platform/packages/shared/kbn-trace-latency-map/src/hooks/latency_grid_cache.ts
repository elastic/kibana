/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DurationStats, TraceSource } from '../types';
import type { MapSampling } from '../query/latency_map_query';
import type { LatencyGrid } from '../query/parse';
import type { TimeGrid } from '../query/time_grid';
import type { OperationHistogram } from '../operations/operation_bands';

/** A map as it was loaded: what a mount of the same source shows at once. */
export interface CachedGrid {
  stats: DurationStats;
  timeGrid: TimeGrid;
  grid?: LatencyGrid;
  sampling?: MapSampling;
  isEmpty: boolean;
  loadedSource: TraceSource;
}

/** The last few entries, the oldest dropped first; a hit counts as new. */
export function createBoundedCache<T>(max: number) {
  const entries = new Map<string, T>();
  return {
    get(key: string): T | undefined {
      const value = entries.get(key);
      if (value !== undefined) {
        entries.delete(key);
        entries.set(key, value);
      }
      return value;
    },
    set(key: string, value: T) {
      entries.delete(key);
      entries.set(key, value);
      if (entries.size > max) entries.delete(entries.keys().next().value as string);
    },
    clear() {
      entries.clear();
    },
  };
}

/**
 * How many maps are kept: the few sources a session moves between (a couple of tabs, a
 * range and the one before it), so that showing a map again costs no query. Keyed by the
 * source's content, so every map of a source shares the entry, whichever host mounted it.
 */
export const LATENCY_GRID_CACHE_SIZE = 8;

/** Duration statistics by source: a resize into another tier keeps them. */
export const statsCache = createBoundedCache<DurationStats>(LATENCY_GRID_CACHE_SIZE);
/** Per-operation histograms by source, which have no time axis either. */
export const operationsCache = createBoundedCache<OperationHistogram[]>(LATENCY_GRID_CACHE_SIZE);
/** The loaded map by source and time columns. */
export const gridCache = createBoundedCache<CachedGrid>(LATENCY_GRID_CACHE_SIZE);

export const getGridCacheKey = (sourceKey: string, targetBins: number) =>
  `${sourceKey}|${targetBins}`;

/** Forgets every loaded map, for tests that load the same source again and again. */
export function clearLatencyGridCaches() {
  statsCache.clear();
  operationsCache.clear();
  gridCache.clear();
}
