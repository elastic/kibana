/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { toResource, type DataManagementResource } from './sample_resources';

const readList = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const readName = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null || !('name' in value)) {
    return undefined;
  }
  const { name } = value;
  return typeof name === 'string' && name.length > 0 ? name : undefined;
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

const loadIndices = async (http: HttpStart): Promise<DataManagementResource[]> => {
  const indices = await http.get<unknown[]>('/api/index_management/indices');
  return readList(indices).flatMap((index) => {
    const name = readName(index);
    const isBackingIndex =
      typeof index === 'object' &&
      index !== null &&
      'data_stream' in index &&
      typeof index.data_stream === 'string';
    if (!name || isHidden(index) || isBackingIndex) {
      return [];
    }
    return [toResource(name, 'index')];
  });
};

const loadDataStreams = async (http: HttpStart): Promise<DataManagementResource[]> => {
  const dataStreams = await http.get<unknown[]>('/api/index_management/data_streams');
  return readList(dataStreams).flatMap((dataStream) => {
    const name = readName(dataStream);
    if (!name || isHidden(dataStream)) {
      return [];
    }
    return [toResource(name, 'dataStream')];
  });
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

/** Indices, data streams, streams, ES|QL views, and datasets that exist in the cluster. */
export const loadDataManagementResources = async (
  http: HttpStart
): Promise<DataManagementResource[]> => {
  const [indices, dataStreams, streams, views, datasets] = await Promise.all([
    loadSafely(loadIndices(http), []),
    loadSafely(loadDataStreams(http), []),
    loadSafely(loadStreams(http), []),
    loadSafely(loadEsqlViews(http), []),
    loadSafely(loadDatasets(http), []),
  ]);

  return [...indices, ...dataStreams, ...streams, ...views, ...datasets];
};
