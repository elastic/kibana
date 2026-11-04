/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
export interface IndicesAutocompleteResult {
  indices: IndexAutocompleteItem[];
}

export interface IndexAutocompleteItem {
  name: string;
  mode: 'lookup' | 'time_series' | string;
  aliases: string[];
  isClosed?: boolean;
}

export interface ESQLSourceResult {
  name: string;
  hidden: boolean;
  title?: string;
  description?: string;
  links?: Array<{ label: string; url: string }>;
  dataStreams?: Array<{ name: string; title?: string }>;
  type?: string;
}

// response from resolve_index api
interface ResolveIndexResponseItem {
  name: string;
  mode?: 'lookup' | 'time_series' | string;
  indices?: string[];
  aliases?: string[];
  attributes?: string[];
  backing_indices?: string[];
}

export interface ResolveIndexResponse {
  indices?: ResolveIndexResponseItem[];
  aliases?: ResolveIndexResponseItem[];
  data_streams?: ResolveIndexResponseItem[];
}

/** The kind of resource a single name resolves to, used to decide if the index editor can edit it. */
export type IndexEditorResolutionKind = 'index' | 'alias' | 'dataStream' | 'none';

/** Normalized resolution of a single index name, returned by the index editor resolve route. */
export interface IndexEditorResolution {
  kind: IndexEditorResolutionKind;
  /** The explicit index mode (e.g. `lookup`, `logsdb`, `time_series`); absent for standard indices. */
  mode?: string;
  closed: boolean;
  frozen: boolean;
  /** Whether the index mapping marks `_routing` as required, which the editor cannot satisfy. */
  routingRequired: boolean;
  /** Whether `_source` is disabled, so the editor cannot read documents to edit. */
  sourceDisabled: boolean;
  /** Whether `_source` is synthetic, so round-tripping edits could silently alter stored values. */
  sourceSynthetic: boolean;
  /**
   * Names of runtime fields defined in the index mapping. Their values are computed at query time,
   * so edits never persist; the editor renders these columns read-only rather than blocking the
   * whole index.
   */
  runtimeFields: string[];
}

export interface EsqlView {
  name: string;
  query: string;
  description?: string;
  reserved?: boolean;
  links?: Array<{ label: string; url: string }>;
  type?: string;
}

export interface EsqlViewsResult {
  views: EsqlView[];
}

export interface EsqlDataset {
  name: string;
  data_source: string;
  resource: string;
  description?: string;
  settings?: Record<string, unknown>;
}

export interface EsqlDatasetsResult {
  datasets: EsqlDataset[];
}
