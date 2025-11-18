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

import type { OmitIndexProp } from './helpers';

export interface ClientSearchRequest<SearchRuntimeMappings extends BaseSearchRuntimeMappings = {}>
  extends Omit<api.SearchRequest, 'index' | 'fields' | 'track_total_hits' | 'size'> {
  fields?: Array<Exclude<keyof SearchRuntimeMappings, number | symbol>>;
  track_total_hits?: boolean | number;
  size?: number;
}

export type ClientSearchResponse<
  TDocument,
  TSearchRequest extends OmitIndexProp<api.SearchRequest>
> = api.SearchResponse<TDocument, TSearchRequest>;

export type ClientGetRequest = OmitIndexProp<api.GetRequest & api.SearchRequest>;
export type ClientGetResponse<TDocument> = api.GetResponse<TDocument>;
export type ClientGet<TDocumentType> = (
  request: ClientGetRequest
) => Promise<ClientGetResponse<TDocumentType>>;

export type ClientIndexRequest<TDocument> = OmitIndexProp<api.IndexRequest<TDocument>>;
export type ClientIndexResponse = api.IndexResponse;
export type ClientIndex<FullDocumentType> = (
  request: ClientIndexRequest<FullDocumentType>
) => Promise<ClientIndexResponse>;

export type ClientBulkOperation<TDocument> =
  | {
      index: { document: Omit<TDocument, '_id'>; _id?: string };
    }
  | { delete: { _id: string } };

export type ClientBulkRequest<TDocument> = Omit<
  OmitIndexProp<api.BulkRequest<TDocument>>,
  'operations'
> & {
  operations: Array<ClientBulkOperation<TDocument>>;
};
export type ClientBulkResponse = api.BulkResponse;
export type ClientBulk<TDocumentType> = (
  request: ClientBulkRequest<TDocumentType>
) => Promise<ClientBulkResponse>;

export type ClientExistsIndex = () => Promise<boolean>;

export interface InternalIDataStreamClient<
  S extends MappingsDefinition,
  FullDocumentType = GetFieldsOf<S>,
  SRM extends BaseSearchRuntimeMappings = never
> {
  search: <Agg extends Record<string, api.AggregationsAggregate> = {}>(
    req: ClientSearchRequest<SRM>,
    transportOpts?: TransportRequestOptionsWithOutMeta
  ) => Promise<api.SearchResponse<GetFieldsOf<S>, Agg>>;

  bulk: ClientBulk<FullDocumentType>;
  index: ClientIndex<FullDocumentType>;
  get: ClientGet<FullDocumentType>;
  existsIndex: ClientExistsIndex;
}
