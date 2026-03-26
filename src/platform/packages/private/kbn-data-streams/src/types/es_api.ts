/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as api from '@elastic/elasticsearch/lib/api/types';

import type { TransportRequestOptionsWithOutMeta } from '@elastic/elasticsearch';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import type { BaseSearchRuntimeMappings } from './runtime';

export interface ClientSearchRequest<SearchRuntimeMappings extends BaseSearchRuntimeMappings = {}>
  extends Omit<api.SearchRequest, 'index' | 'fields' | 'track_total_hits' | 'size'> {
  fields?: Array<Exclude<keyof SearchRuntimeMappings, number | symbol>>;
  track_total_hits?: boolean | number;
  size?: number;
  /**
   * Optional space identifier. Controls which documents are included in the search:
   * - When undefined: only space-agnostic documents (no `kibana.space_ids` field) are returned.
   * - When `'default'`: only documents with `kibana.space_ids: ['default']` are returned.
   * - When any other space: only documents belonging to that space are returned.
   *
   * `kibana.space_ids` is always preserved in `_source` when present.
   */
  space?: string;
}

export type ClientSearchResponse<
  TDocument,
  TSearchRequest extends Omit<api.SearchRequest, 'index'>
> = api.SearchResponse<TDocument, TSearchRequest>;

export type ClientCreateRequest<TDocument> = Omit<
  api.BulkRequest<TDocument>,
  'operations' | 'index'
> & {
  /**
   * Array of documents to create. Each document can optionally include an `_id` property.
   * Documents are converted internally to ES bulk create operations.
   */
  documents: Array<{ _id?: string } & TDocument>;
  /**
   * Optional space identifier. When provided (including `'default'`), document IDs are
   * prefixed as `{space}::{id}` and documents are decorated with `kibana.space_ids: [space]`.
   * When undefined, no ID prefixing or decoration is applied.
   */
  space?: string;
};
export type ClientCreateResponse = api.BulkResponse;
export type ClientCreate<TDocumentType> = (
  request: ClientCreateRequest<TDocumentType>
) => Promise<ClientCreateResponse>;

export type ClientExists = () => Promise<boolean>;

/**
 * Represents a document returned from a space-aware search (i.e. when `space` is provided).
 * The `kibana.space_ids` property is always present and reflects the space the document belongs to.
 */
export type SpaceAwareDocument<T> = T & { kibana: { space_ids: string[] } };

export interface InternalIDataStreamClient<
  S extends MappingsDefinition,
  FullDocumentType = GetFieldsOf<S>,
  SRM extends BaseSearchRuntimeMappings = never
> {
  search: {
    <Agg extends Record<string, api.AggregationsAggregate> = {}>(
      req: ClientSearchRequest<SRM> & { space: string },
      transportOpts?: TransportRequestOptionsWithOutMeta
    ): Promise<api.SearchResponse<SpaceAwareDocument<FullDocumentType>, Agg>>;
    <Agg extends Record<string, api.AggregationsAggregate> = {}>(
      req: ClientSearchRequest<SRM> & { space?: undefined },
      transportOpts?: TransportRequestOptionsWithOutMeta
    ): Promise<api.SearchResponse<FullDocumentType, Agg>>;
  };

  create: ClientCreate<FullDocumentType>;
  exists: ClientExists;
}
