/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const LOOKUP_INDEX_MODE = 'lookup';
const VECTOR_INDEX_MODE = 'vectordb_document';

export type IndexHealth = 'green' | 'yellow' | 'red';

export interface StorageIndex {
  hidden: boolean;
  /** Set when this index backs a data stream. */
  dataStream?: string;
  mode?: string;
  /** Primary store size in bytes. Absent when index stats are unavailable. */
  primarySize?: number;
  isFrozen: boolean;
  /** ILM phase, when the index is managed. */
  phase?: string;
  /** Cluster health. Absent when index stats did not report it. */
  health?: IndexHealth;
}

export interface StatsDataStream {
  name: string;
  hidden: boolean;
  indexMode?: string;
  /** Health of the data stream's backing indices. */
  health?: IndexHealth;
}

export interface ResourceHealthCounts {
  /** False when no listed index or data stream reported health. */
  known: boolean;
  green: number;
  yellow: number;
  red: number;
}

export interface ResourceCounts {
  indices: number;
  dataStreams: number;
  lookup: number;
  federated: number;
  views: number;
  vector: number;
  streams: number;
}

export interface ResidentStorageBytes {
  /** False when index stats did not report a size. */
  known: boolean;
  hot: number;
  warm: number;
  cold: number;
  frozen: number;
}

export interface ResourceStats {
  counts: ResourceCounts;
  total: number;
  resident: ResidentStorageBytes;
  /** Federated data source types. Byte sizes are not available from the data source API. */
  federatedSources: string[];
  /** Health of visible indices and data streams. Streams share their data stream's health. */
  health: ResourceHealthCounts;
}

const isLookupMode = (mode: string | undefined): boolean => mode === LOOKUP_INDEX_MODE;
const isVectorMode = (mode: string | undefined): boolean => mode === VECTOR_INDEX_MODE;

const residentTier = (index: StorageIndex): keyof Omit<ResidentStorageBytes, 'known'> => {
  if (index.isFrozen || index.phase === 'frozen') {
    return 'frozen';
  }
  if (index.phase === 'warm' || index.phase === 'cold' || index.phase === 'hot') {
    return index.phase;
  }
  return 'hot';
};

/**
 * Summarize overview stats from the same sources the table lists.
 * Lookup and vector indices are counted on their own, not as plain indices.
 * Resident bytes include data-stream backing indices and follow the ILM phase.
 */
export const buildResourceStats = ({
  indices,
  dataStreams,
  streamCount,
  viewCount,
  datasetCount,
  dataSourceTypes,
}: {
  indices: readonly StorageIndex[];
  dataStreams: readonly StatsDataStream[];
  streamCount: number;
  viewCount: number;
  datasetCount: number;
  dataSourceTypes: readonly string[];
}): ResourceStats => {
  const visibleIndices = indices.filter((index) => !index.hidden && !index.dataStream);
  const visibleDataStreams = dataStreams.filter((dataStream) => !dataStream.hidden);

  const counts: ResourceCounts = {
    indices: visibleIndices.filter(
      (index) => !isLookupMode(index.mode) && !isVectorMode(index.mode)
    ).length,
    dataStreams: visibleDataStreams.filter(
      (dataStream) => !isLookupMode(dataStream.indexMode) && !isVectorMode(dataStream.indexMode)
    ).length,
    lookup:
      visibleIndices.filter((index) => isLookupMode(index.mode)).length +
      visibleDataStreams.filter((dataStream) => isLookupMode(dataStream.indexMode)).length,
    federated: datasetCount,
    views: viewCount,
    vector:
      visibleIndices.filter((index) => isVectorMode(index.mode)).length +
      visibleDataStreams.filter((dataStream) => isVectorMode(dataStream.indexMode)).length,
    streams: streamCount,
  };

  const hiddenDataStreams = new Set(
    dataStreams.filter((dataStream) => dataStream.hidden).map((dataStream) => dataStream.name)
  );
  const storedIndices = indices.filter((index) =>
    index.dataStream ? !hiddenDataStreams.has(index.dataStream) : !index.hidden
  );
  const resident: ResidentStorageBytes = {
    known: storedIndices.length === 0 || storedIndices.some((index) => index.primarySize != null),
    hot: 0,
    warm: 0,
    cold: 0,
    frozen: 0,
  };
  if (resident.known) {
    for (const index of storedIndices) {
      resident[residentTier(index)] += index.primarySize ?? 0;
    }
  }

  const federatedSources: string[] = [];
  for (const type of dataSourceTypes) {
    if (type && !federatedSources.includes(type)) {
      federatedSources.push(type);
    }
  }

  const health: ResourceHealthCounts = { known: false, green: 0, yellow: 0, red: 0 };
  for (const index of visibleIndices) {
    if (index.health) {
      health.known = true;
      health[index.health] += 1;
    }
  }
  for (const dataStream of visibleDataStreams) {
    if (dataStream.health) {
      health.known = true;
      health[dataStream.health] += 1;
    }
  }

  return {
    counts,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
    resident,
    federatedSources,
    health,
  };
};
