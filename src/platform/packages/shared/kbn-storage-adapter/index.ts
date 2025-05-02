/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  BulkRequest,
  BulkResponse,
  DeleteRequest,
  GetRequest,
  GetResponse,
  IndexRequest,
  IndexResponse,
  Result,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { InferSearchResponseOf } from '@kbn/es-types';
import { StorageFieldTypeOf, StorageMappingProperty } from './types';

interface StorageSchemaProperties {
  [x: string]: StorageMappingProperty;
}

export interface StorageSchema {
  properties: StorageSchemaProperties;
}

interface StorageSettingsBase {
  schema: StorageSchema;
}

export interface IndexStorageSettings extends StorageSettingsBase {
  name: string;
}

export type StorageSettings = IndexStorageSettings;

export type StorageClientSearchRequest = Omit<SearchRequest, 'index'> & {
  track_total_hits: boolean | number;
  size: number;
};

export type StorageClientSearchResponse<
  TDocument,
  TSearchRequest extends Omit<SearchRequest, 'index'>
> = InferSearchResponseOf<TDocument, TSearchRequest>;

export type StorageClientBulkOperation<TDocument extends { _id?: string }> =
  | {
      index: { document: Omit<TDocument, '_id'>; _id?: string };
    }
  | { delete: { _id: string } };

export type StorageClientBulkRequest<TDocument extends { _id?: string }> = Omit<
  BulkRequest,
  'operations' | 'index'
> & {
  operations: Array<StorageClientBulkOperation<TDocument>>;
};
export type StorageClientBulkResponse = BulkResponse;

export type StorageClientDeleteRequest = Omit<DeleteRequest, 'index'>;

export interface StorageClientDeleteResponse {
  acknowledged: boolean;
  result: Extract<Result, 'deleted' | 'not_found'>;
}

export interface StorageClientCleanResponse {
  acknowledged: boolean;
  result: Extract<Result, 'deleted' | 'noop'>;
}

export type StorageClientIndexRequest<TDocument = unknown> = Omit<
  IndexRequest<Omit<TDocument, '_id'>>,
  'index'
>;

export type StorageClientIndexResponse = IndexResponse;

export type StorageClientGetRequest = Omit<GetRequest & SearchRequest, 'index'>;
export type StorageClientGetResponse<TDocument extends { _id?: string }> = GetResponse<TDocument>;

export type StorageClientSearch<TDocumentType = never> = <
  TSearchRequest extends StorageClientSearchRequest
>(
  request: TSearchRequest
) => Promise<StorageClientSearchResponse<TDocumentType, TSearchRequest>>;

export type StorageClientBulk<TDocumentType extends { _id?: string } = never> = (
  request: StorageClientBulkRequest<TDocumentType>
) => Promise<StorageClientBulkResponse>;

export type StorageClientIndex<TDocumentType = never> = (
  request: StorageClientIndexRequest<TDocumentType>
) => Promise<StorageClientIndexResponse>;

export type StorageClientDelete = (
  request: StorageClientDeleteRequest
) => Promise<StorageClientDeleteResponse>;

export type StorageClientClean = () => Promise<StorageClientCleanResponse>;

export type StorageClientGet<TDocumentType extends { _id?: string } = never> = (
  request: StorageClientGetRequest
) => Promise<StorageClientGetResponse<TDocumentType>>;

export type StorageClientExistsIndex = () => Promise<boolean>;

export interface InternalIStorageClient<TDocumentType extends { _id?: string } = never> {
  search: StorageClientSearch<TDocumentType>;
  bulk: StorageClientBulk<TDocumentType>;
  index: StorageClientIndex<TDocumentType>;
  delete: StorageClientDelete;
  clean: StorageClientClean;
  get: StorageClientGet<TDocumentType>;
  existsIndex: StorageClientExistsIndex;
}

type UnionKeys<T> = T extends T ? keyof T : never;
type Exact<T, U> = T extends U
  ? Exclude<UnionKeys<T>, UnionKeys<U>> extends never
    ? true
    : false
  : false;

type MissingKeysError<T extends string> = Error &
  `The following keys are missing from the schema: ${T}`;

// The storage settings need to support the application payload type, but it's OK if the
// storage document can hold more fields than the application document.
// To keep the type safety of the application type in the consuming code, both the storage
// settings and the application type are passed to the IStorageClient type.
// The IStorageClient type then checks if the application type is a subset of the storage
// document type. If this is not the case, the IStorageClient type is set to never, which
// will cause a type error in the consuming code.
export type IStorageClient<
  TSchema extends IndexStorageSettings,
  TApplicationType extends StorageDocumentOf<TSchema>
> = Exact<TApplicationType, StorageDocumentOf<TSchema>> extends true
  ? InternalIStorageClient<TApplicationType>
  : MissingKeysError<Exclude<UnionKeys<TApplicationType>, UnionKeys<StorageDocumentOf<TSchema>>>>;

export type SimpleIStorageClient<TStorageSettings extends IndexStorageSettings> = IStorageClient<
  TStorageSettings,
  StorageDocumentOf<TStorageSettings>
>;

export type StorageDocumentOf<TStorageSettings extends StorageSettings> = Partial<
  StorageFieldTypeOf<{
    type: 'object';
    properties: TStorageSettings['schema']['properties'];
  }>
>;

export { StorageIndexAdapter } from './src/index_adapter';

export { types } from './types';
