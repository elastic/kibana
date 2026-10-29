/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import {
  buildResourceStats,
  type IndexHealth,
  type ResourceStats,
  type StatsDataStream,
  type StorageIndex,
} from './resource_stats';
import { sampleOverviewData } from './sample_overview_data';
import {
  resourceKindForIndexMode,
  toResource,
  type DataManagementResource,
} from './sample_resources';

export interface DataManagementOverviewData {
  resources: DataManagementResource[];
  stats: ResourceStats;
}

const readList = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const readName = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null || !('name' in value)) {
    return undefined;
  }
  const { name } = value;
  return typeof name === 'string' && name.length > 0 ? name : undefined;
};

const readIndexStatus = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null || !('status' in value)) {
    return undefined;
  }
  const { status } = value;
  return typeof status === 'string' && status.length > 0 ? status : undefined;
};

const isHidden = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && 'hidden' in value && value.hidden === true;

const loadSafely = async <T>(request: Promise<T>, fallback: T): Promise<T> => {
  try {
    return await request;
  } catch {
    return fallback;
  }
};

const readString = (value: unknown, key: string): string | undefined => {
  if (typeof value !== 'object' || value === null || !(key in value)) {
    return undefined;
  }
  const field = value[key as keyof typeof value];
  return typeof field === 'string' && field.length > 0 ? field : undefined;
};

const readBytes = (value: unknown, key: string): number | undefined => {
  if (typeof value !== 'object' || value === null || !(key in value)) {
    return undefined;
  }
  const field = value[key as keyof typeof value];
  return typeof field === 'number' ? field : undefined;
};

const readHealth = (value: unknown): IndexHealth | undefined => {
  const health = readString(value, 'health')?.toLowerCase();
  if (health === 'green' || health === 'yellow' || health === 'red') {
    return health;
  }
  return undefined;
};

const readPhase = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null || !('ilm' in value)) {
    return undefined;
  }
  const { ilm } = value;
  return readString(ilm, 'phase');
};

const toStorageIndex = (index: unknown): StorageIndex | undefined => {
  const name = readName(index);
  if (!name) {
    return undefined;
  }
  return {
    hidden: isHidden(index),
    dataStream: readString(index, 'data_stream'),
    mode: readString(index, 'mode'),
    primarySize: readBytes(index, 'primary_size'),
    isFrozen:
      typeof index === 'object' && index !== null && 'isFrozen' in index && index.isFrozen === true,
    phase: readPhase(index),
    health: readHealth(index),
  };
};

const loadIndices = async (
  http: HttpStart
): Promise<{ resources: DataManagementResource[]; storage: StorageIndex[] }> => {
  const indices = await http.get<unknown[]>('/api/index_management/indices');
  const resources: DataManagementResource[] = [];
  const storage: StorageIndex[] = [];

  for (const index of readList(indices)) {
    const stored = toStorageIndex(index);
    if (!stored) {
      continue;
    }
    storage.push(stored);
    const name = readName(index);
    if (name && !stored.hidden && !stored.dataStream) {
      resources.push(
        toResource(
          name,
          resourceKindForIndexMode(stored.mode),
          readIndexStatus(index),
          stored.mode,
          stored.health
        )
      );
    }
  }

  return { resources, storage };
};

const loadDataStreams = async (
  http: HttpStart
): Promise<{ resources: DataManagementResource[]; dataStreams: StatsDataStream[] }> => {
  const response = await http.get<unknown[]>('/api/index_management/data_streams');
  const dataStreams = readList(response).flatMap((dataStream): StatsDataStream[] => {
    const name = readName(dataStream);
    if (!name) {
      return [];
    }
    return [
      {
        name,
        hidden: isHidden(dataStream),
        indexMode: readString(dataStream, 'indexMode'),
        health: readHealth(dataStream),
      },
    ];
  });
  return {
    dataStreams,
    resources: dataStreams.flatMap((dataStream) =>
      dataStream.hidden
        ? []
        : [toResource(dataStream.name, 'dataStream', undefined, undefined, dataStream.health)]
    ),
  };
};

const loadStreams = async (http: HttpStart): Promise<DataManagementResource[]> => {
  const response = await http.get<{
    streams?: Array<{ data_stream?: { name?: string }; stream?: { name?: string } }>;
  }>('/internal/streams');

  return readList(response.streams).flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null || !('stream' in entry)) {
      return [];
    }
    const stream = entry as { data_stream?: { name?: string }; stream?: { name?: string } };
    const name = stream.stream?.name;
    // Root stream definitions exist before their data stream does. Those detail pages cannot load.
    if (!name || !stream.data_stream?.name) {
      return [];
    }
    return [toResource(name, 'stream')];
  });
};

const loadEsqlViews = async (http: HttpStart): Promise<DataManagementResource[]> => {
  const response = await http.get<{ views?: unknown[] }>('/internal/esql/views', {
    query: { strict: true },
  });
  return readList(response.views).flatMap((view) => {
    const name = readName(view);
    return name ? [toResource(name, 'esqlView')] : [];
  });
};

const loadDatasets = async (http: HttpStart): Promise<DataManagementResource[]> => {
  const response = await http.get<{ data_sets?: unknown[] }>('/internal/data_federation/dataset');
  return readList(response.data_sets).flatMap((dataset) => {
    const name = readName(dataset);
    return name ? [toResource(name, 'dataset')] : [];
  });
};

const loadDataSourceTypes = async (http: HttpStart): Promise<string[]> => {
  const response = await http.get<{ data_sources?: unknown[] } | unknown[]>(
    '/internal/data_federation/data_sources'
  );
  const sources = Array.isArray(response) ? response : readList(response.data_sources);
  return sources.flatMap((source) => {
    const type = readString(source, 'type');
    return type ? [type] : [];
  });
};

const emptyIndices = { resources: [] as DataManagementResource[], storage: [] as StorageIndex[] };
const emptyDataStreams = {
  resources: [] as DataManagementResource[],
  dataStreams: [] as StatsDataStream[],
};

/** Indices, data streams, streams, ES|QL views, and datasets, plus overview stats. */
export const loadDataManagementResources = async (
  http: HttpStart
): Promise<DataManagementOverviewData> => {
  const [indices, dataStreams, streams, views, datasets, dataSourceTypes] = await Promise.all([
    loadSafely(loadIndices(http), emptyIndices),
    loadSafely(loadDataStreams(http), emptyDataStreams),
    loadSafely(loadStreams(http), []),
    loadSafely(loadEsqlViews(http), []),
    loadSafely(loadDatasets(http), []),
    loadSafely(loadDataSourceTypes(http), []),
  ]);

  const sample = sampleOverviewData();

  return {
    resources: [
      ...indices.resources,
      ...dataStreams.resources,
      ...streams,
      ...views,
      ...datasets,
      ...sample.resources,
    ],
    stats: buildResourceStats({
      indices: [...indices.storage, ...sample.indices],
      dataStreams: [...dataStreams.dataStreams, ...sample.dataStreams],
      streamCount: streams.length + sample.streamCount,
      viewCount: views.length + sample.viewCount,
      datasetCount: datasets.length + sample.datasetCount,
      dataSourceTypes: [...dataSourceTypes, ...sample.dataSourceTypes],
    }),
  };
};
