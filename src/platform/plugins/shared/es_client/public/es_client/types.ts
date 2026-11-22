/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  TransportRequestOptions,
  TransportRequestOptionsWithMeta,
  TransportRequestParams,
  TransportResult,
} from '@elastic/elasticsearch';
import type API from '@elastic/elasticsearch/lib/api/index';
import type {
  BulkRequest,
  BulkResponse,
  GetRequest,
  GetResponse,
} from '@elastic/elasticsearch/lib/api/types';

/**
 * The result of a request sent with `meta: true`. It is the part of elasticsearch-js'
 * `TransportResult` that a browser request through the proxy can fill.
 */
export interface EsClientResult<TResponse = unknown>
  extends Pick<TransportResult<TResponse>, 'body' | 'statusCode' | 'headers' | 'warnings'> {
  meta: Pick<TransportResult['meta'], 'request' | 'aborted'>;
}

/** Options for a request sent with `asStream: true`. */
export type TransportRequestOptionsAsStream = TransportRequestOptions & { asStream: true };

/** The proxy transport. It implements the elasticsearch-js `transport.request` API. */
export interface EsClientTransport {
  request(
    params: TransportRequestParams,
    options: TransportRequestOptionsAsStream & TransportRequestOptionsWithMeta
  ): Promise<EsClientResult<ReadableStream<Uint8Array> | null>>;
  request(
    params: TransportRequestParams,
    options: TransportRequestOptionsAsStream
  ): Promise<ReadableStream<Uint8Array> | null>;
  request<TResponse = unknown>(
    params: TransportRequestParams,
    options: TransportRequestOptionsWithMeta
  ): Promise<EsClientResult<TResponse>>;
  request<TResponse = unknown>(
    params: TransportRequestParams,
    options?: TransportRequestOptions
  ): Promise<TResponse>;
}

/**
 * A generated API method without its elasticsearch-js `this`, which requires a Node `Transport`.
 * Calls with `meta: true` resolve with `EsClientResult`.
 */
type EsClientMethod<TApi> = TApi extends (
  this: never,
  ...args: infer TArgs
) => Promise<infer TResponse>
  ? {
      (params: TArgs[0], options: TransportRequestOptionsWithMeta): Promise<
        EsClientResult<TResponse>
      >;
      (...args: TArgs): Promise<TResponse>;
    }
  : never;

/** A generated API namespace without its `transport` field, which is a Node `Transport`. */
type EsClientNamespace<TNamespace> = {
  [TKey in keyof TNamespace as TNamespace[TKey] extends (...args: never[]) => unknown
    ? TKey
    : never]: EsClientMethod<TNamespace[TKey]>;
};

/** `get`, typed by hand because mapping its overloads would drop the document type parameter. */
interface EsClientGetMethod {
  <TDocument = unknown>(params: GetRequest, options: TransportRequestOptionsWithMeta): Promise<
    EsClientResult<GetResponse<TDocument>>
  >;
  <TDocument = unknown>(params: GetRequest, options?: TransportRequestOptions): Promise<
    GetResponse<TDocument>
  >;
}

/** The elasticsearch-js APIs the client exposes. The others are disabled in `create_es_client.ts`. */
type EnabledApiName = 'count' | 'delete' | 'get' | 'indices';

type ApiMembers = Pick<API, EnabledApiName>;

type EsClientApi = {
  [TKey in keyof ApiMembers]: TKey extends 'get'
    ? EsClientGetMethod
    : ApiMembers[TKey] extends (...args: never[]) => unknown
    ? EsClientMethod<ApiMembers[TKey]>
    : EsClientNamespace<ApiMembers[TKey]>;
};

/** The `this` of client methods, which send requests through `this.transport`. */
export interface EsClientContext {
  transport: EsClientTransport;
}

export type BulkApi = <TDocument = unknown, TPartialDocument = Partial<TDocument>>(
  this: EsClientContext,
  params: BulkRequest<TDocument, TPartialDocument>,
  options?: TransportRequestOptions
) => Promise<BulkResponse>;

/**
 * The elasticsearch-js API surface, sent through the Elasticsearch proxy. Calls with `meta: true`
 * resolve with `EsClientResult`, and `transport` only implements `request`.
 */
export type EsClient = EsClientApi & {
  readonly transport: EsClientTransport;
  // bulk: EsClientMethod<BulkApi>;
};
