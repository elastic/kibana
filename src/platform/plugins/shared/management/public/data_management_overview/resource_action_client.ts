/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';

const postIndices = (http: HttpStart, path: string, body: object) =>
  http.post(path, { body: JSON.stringify(body) });

export const closeIndex = (http: HttpStart, name: string) =>
  postIndices(http, '/api/index_management/indices/close', { indices: [name] });

export const openIndex = (http: HttpStart, name: string) =>
  postIndices(http, '/api/index_management/indices/open', { indices: [name] });

export const refreshIndex = (http: HttpStart, name: string) =>
  postIndices(http, '/api/index_management/indices/refresh', { indices: [name] });

export const flushIndex = (http: HttpStart, name: string) =>
  postIndices(http, '/api/index_management/indices/flush', { indices: [name] });

export const clearIndexCache = (http: HttpStart, name: string) =>
  postIndices(http, '/api/index_management/indices/clear_cache', { indices: [name] });

export const forceMergeIndex = (http: HttpStart, name: string, maxNumSegments: string) =>
  postIndices(http, '/api/index_management/indices/forcemerge', {
    indices: [name],
    maxNumSegments,
  });

export const deleteIndex = (http: HttpStart, name: string) =>
  postIndices(http, '/api/index_management/indices/delete', { indices: [name] });

export const deleteDataStream = async (http: HttpStart, name: string): Promise<void> => {
  const result = await http.post<{ dataStreamsDeleted?: string[]; errors?: unknown[] }>(
    '/api/index_management/delete_data_streams',
    { body: JSON.stringify({ dataStreams: [name] }) }
  );
  if (!result.dataStreamsDeleted?.includes(name)) {
    throw new Error('Data stream was not deleted');
  }
};

export const deleteStream = (http: HttpStart, name: string) =>
  http.delete(`/api/streams/${encodeURIComponent(name)}`, { version: '2023-10-31' });

export const deleteEsqlView = (http: HttpStart, name: string) =>
  http.delete(`/internal/esql/views/${encodeURIComponent(name)}`);

export const deleteDataset = (http: HttpStart, name: string) =>
  http.delete(`/internal/data_federation/dataset/${encodeURIComponent(name)}`);
