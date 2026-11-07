/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  Transport,
  TransportRequestOptions,
  TransportRequestOptionsWithMeta,
  TransportRequestParams,
  TransportResult,
} from '@elastic/elasticsearch';
import type API from '@elastic/elasticsearch/lib/api/index';
import type { BulkRequest, BulkResponse } from '@elastic/elasticsearch/lib/api/types';

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

/** Puts an overload that resolves `meta: true` calls with `EsClientResult` ahead of an API's own overloads. */
type WithEsClientResult<TApi> = TApi extends (
  this: infer TThis,
  ...args: infer TArgs
) => Promise<infer TResponse>
  ? ((
      this: TThis,
      params: TArgs[0],
      options: TransportRequestOptionsWithMeta
    ) => Promise<EsClientResult<TResponse>>) &
      TApi
  : TApi;

type WithEsClientResults<TNamespace> = {
  [TKey in keyof TNamespace]: WithEsClientResult<TNamespace[TKey]>;
};

type ApiMembers = Pick<API, Exclude<Extract<keyof API, string>, 'bulk' | 'transport'>>;

type EsClientApi = {
  [TKey in keyof ApiMembers]: ApiMembers[TKey] extends (...args: never[]) => unknown
    ? WithEsClientResult<ApiMembers[TKey]>
    : WithEsClientResults<ApiMembers[TKey]>;
};

/** The `this` of client methods, which send requests through `this.transport`. */
export interface EsClientContext {
  transport: EsClientTransport;
}

type BulkApi = <TDocument = unknown, TPartialDocument = Partial<TDocument>>(
  this: EsClientContext,
  params: BulkRequest<TDocument, TPartialDocument>,
  options?: TransportRequestOptions
) => Promise<BulkResponse>;

/**
 * The elasticsearch-js API surface, sent through the Elasticsearch proxy. Calls with `meta: true`
 * resolve with `EsClientResult`, and `transport` only implements `request`.
 */
export type EsClient = EsClientApi & {
  // The generated API methods require `this.transport` to be an elasticsearch-js `Transport`.
  readonly transport: EsClientTransport & Transport;
  bulk: WithEsClientResult<BulkApi>;
};
