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

export type ClientBulkOperation<TDocument extends { _id?: string }> =
  | {
      index: { document: Omit<TDocument, '_id'>; _id?: string };
    }
  | { delete: { _id: string } };

export type ClientBulkRequest<TDocument extends { _id?: string }> = Omit<
  OmitIndexProp<api.BulkRequest>,
  'operations'
> & {
  operations: Array<ClientBulkOperation<TDocument>>;
};

export type ClientGetRequest = OmitIndexProp<api.GetRequest & api.SearchRequest>;
export type ClientGetResponse<TDocument extends { _id?: string }> = api.GetResponse<TDocument>;

export type ClientIndexRequest<TDocument extends { _id?: string }> = Omit<
  api.IndexRequest<TDocument>,
  'index'
>;
export type ClientIndexResponse = api.IndexResponse;

export type ClientBulk<TDocumentType extends { _id?: string } = never> = (
  request: ClientBulkRequest<TDocumentType>
) => Promise<api.BulkResponse>;

export type ClientIndex<S extends MappingsDefinition> = (
  request: ClientIndexRequest<GetFieldsOf<S>>
) => Promise<ClientIndexResponse>;

export type ClientGet<TDocumentType extends { _id?: string } = never> = (
  request: ClientGetRequest
) => Promise<ClientGetResponse<TDocumentType>>;

export type ClientExistsIndex = () => Promise<boolean>;

export interface InternalIDataStreamClient<
  S extends MappingsDefinition,
  SRM extends BaseSearchRuntimeMappings = {},
  FullDocumentType extends { _id?: string } = GetFieldsOf<S>
> {
  search: <Agg extends Record<string, api.AggregationsAggregate> = {}>(
    req: ClientSearchRequest<SRM>,
    transportOpts?: TransportRequestOptionsWithOutMeta
  ) => Promise<api.SearchResponse<GetFieldsOf<S>, Agg>>;

  bulk: ClientBulk<FullDocumentType>;
  index: ClientIndex<S>;
  get: ClientGet<FullDocumentType>;
  existsIndex: ClientExistsIndex;
}
