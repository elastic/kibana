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
   * Optional space identifier. When provided, results are filtered to only include
   * documents belonging to this space. When undefined, only space-agnostic documents
   * are returned.
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
   * Optional space identifier. When provided, prefixes document IDs and decorates
   * documents with kibana.space_ids. When undefined, rejects space-prefixed IDs.
   */
  space?: string;
};
export type ClientCreateResponse = api.BulkResponse;
export type ClientCreate<TDocumentType> = (
  request: ClientCreateRequest<TDocumentType>
) => Promise<ClientCreateResponse>;

export type ClientExists = () => Promise<boolean>;

export interface InternalIDataStreamClient<
  S extends MappingsDefinition,
  FullDocumentType = GetFieldsOf<S>,
  SRM extends BaseSearchRuntimeMappings = never
> {
  search: <Agg extends Record<string, api.AggregationsAggregate> = {}>(
    req: ClientSearchRequest<SRM>,
    transportOpts?: TransportRequestOptionsWithOutMeta
  ) => Promise<api.SearchResponse<FullDocumentType, Agg>>;

  create: ClientCreate<FullDocumentType>;
  exists: ClientExists;
}
