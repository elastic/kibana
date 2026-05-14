/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const EMBEDDING_EXPLORER_LAB_ID = 'embedding_explorer' as const;
export const EMBEDDING_EXPLORER_APP_ID = 'labsEmbeddingExplorer';
export const EMBEDDING_EXPLORER_SAMPLE_API_PATH = '/internal/labs/embedding_explorer/sample';
export const EMBEDDING_EXPLORER_INDICES_API_PATH = '/internal/labs/embedding_explorer/indices';
export const EMBEDDING_EXPLORER_INDEX_FIELDS_API_PATH =
  '/internal/labs/embedding_explorer/index_fields';
export const EMBEDDING_EXPLORER_INDEX_DATA_API_PATH =
  '/internal/labs/embedding_explorer/index_data';

export type EmbeddingExplorerMetadataValue = string | number | boolean | null;

export interface EmbeddingExplorerPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  summary: string;
  category: string;
  source: string;
  metadata: Record<string, EmbeddingExplorerMetadataValue>;
  neighbors?: string[];
  vector?: number[];
}

export interface EmbeddingExplorerDatasetResponse {
  datasetName: string;
  description: string;
  projectionNote: string;
  points: EmbeddingExplorerPoint[];
}

export interface EmbeddingExplorerIndexOption {
  name: string;
}

export interface EmbeddingExplorerIndicesResponse {
  indices: EmbeddingExplorerIndexOption[];
}

export interface EmbeddingExplorerIndexFieldsResponse {
  index: string;
  vectorFields: string[];
  projectionFields: string[];
  labelFields: string[];
  categoryFields: string[];
  projectionRequiredNotice?: string;
  rawVectorProjectionNotice?: string;
}

export interface EmbeddingExplorerIndexDataRequest {
  index: string;
  vectorField: string;
  xField?: string;
  yField?: string;
  labelField?: string;
  categoryField?: string;
  size?: number;
}

export interface EmbeddingExplorerIndexDataResponse extends EmbeddingExplorerDatasetResponse {
  index: string;
  projectionSource: 'computed' | 'precomputed';
  vectorField: string;
}
