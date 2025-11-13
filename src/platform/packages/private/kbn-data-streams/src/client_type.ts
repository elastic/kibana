/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as api from '@elastic/elasticsearch/lib/api/types';
import type { MappingsDefinition, DocumentOf } from '@kbn/es-mappings';

type OmitIndexProp<T> = Omit<T, 'index'>;

type ClientSearchRequest = OmitIndexProp<api.SearchRequest> & {
  track_total_hits: boolean | number;
  size: number;
};

type ClientSearchResponse<
  TDocument,
  TSearchRequest extends OmitIndexProp<api.SearchRequest>
> = api.SearchResponse<TDocument, TSearchRequest>;

type ClientBulkOperation<TDocument extends { _id?: string }> =
  | {
      index: { document: Omit<TDocument, '_id'>; _id?: string };
    }
  | { delete: { _id: string } };

type ClientBulkRequest<TDocument extends { _id?: string }> = Omit<
  OmitIndexProp<api.BulkRequest>,
  'operations'
> & {
  operations: Array<ClientBulkOperation<TDocument>>;
};

type ClientIndexRequest<TDocument = unknown> = OmitIndexProp<
  api.IndexRequest<Omit<TDocument, '_id'>>
>;

type ClientIndexResponse = api.IndexResponse;

type ClientGetRequest = OmitIndexProp<api.GetRequest & api.SearchRequest>;
type ClientGetResponse<TDocument extends { _id?: string }> = api.GetResponse<TDocument>;

type ClientSearch<TDocumentType = never> = <TSearchRequest extends ClientSearchRequest>(
  request: TSearchRequest
) => Promise<ClientSearchResponse<TDocumentType, TSearchRequest>>;

type ClientBulk<TDocumentType extends { _id?: string } = never> = (
  request: ClientBulkRequest<TDocumentType>
) => Promise<api.BulkResponse>;

type ClientIndex<TDocumentType = never> = (
  request: ClientIndexRequest<TDocumentType>
) => Promise<ClientIndexResponse>;

type ClientGet<TDocumentType extends { _id?: string } = never> = (
  request: ClientGetRequest
) => Promise<ClientGetResponse<TDocumentType>>;

type ClientExistsIndex = () => Promise<boolean>;

export interface InternalIDataStreamClient<TDocumentType extends { _id?: string } = never> {
  search: ClientSearch<TDocumentType>;
  bulk: ClientBulk<TDocumentType>;
  index: ClientIndex<TDocumentType>;
  get: ClientGet<TDocumentType>;
  existsIndex: ClientExistsIndex;
}

interface DataStreamTemplateDefinition {
  mappings: MappingsDefinition;
}

export interface DataStreamDefinition<SearchRuntimeMappings extends BaseSearchRuntimeMappings = {}>
  extends DataStreamTemplateDefinition {
  /**
   * @remark Once released this should never change.
   */
  name: string;

  // https://www.elastic.co/docs/manage-data/data-store/mapping/define-runtime-fields-in-search-request
  searchRuntimeMappings?: SearchRuntimeMappings;
}

export interface BaseSearchRuntimeMappings {
  [objectPath: string]: api.MappingRuntimeField;
}

export interface ClientHelpers<SRM extends BaseSearchRuntimeMappings> {
  /** A helper to get types from your search runtime fields */
  getFieldsFromHit: (response: api.SearchHit) => {
    [key in Exclude<keyof SRM, number | symbol>]: unknown[];
  };
}

export interface IDataStreamClient<
  Definition extends DataStreamDefinition,
  SRM extends BaseSearchRuntimeMappings = never
> extends InternalIDataStreamClient<DocumentOf<Definition>> {
  /** Clint Helpers */
  helpers: ClientHelpers<SRM>;
}
