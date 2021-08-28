/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Observable } from 'rxjs';
import type { RequestHandler } from '../../../core/server/http/router/router';
import type { StreamingResponseHandler } from '../common/streaming/types';
import type { RequestHandlerContext } from '../../../core/server';
import { KibanaRequest } from '../../../core/server/http/router/request';
import type { RouteMethod } from '../../../core/server/http/router/route';;

/**
 * Request handler modified to allow to return an observable.
 *
 * See {@link BfetchServerSetup.createStreamingRequestHandler} for usage example.
 * @public
 */
export type StreamingRequestHandler<
  Response = unknown,
  P = unknown,
  Q = unknown,
  B = unknown,
  Method extends RouteMethod = any
> = (
  context: RequestHandlerContext,
  request: KibanaRequest<P, Q, B, Method>
) => Observable<Response> | Promise<Observable<Response>>;



// eslint-disable-next-line
export interface BfetchServerSetupDependencies {}

// eslint-disable-next-line
export interface BfetchServerStartDependencies {}

export interface BatchProcessingRouteParams<BatchItemData, BatchItemResult> {
  onBatchItem: (data: BatchItemData) => Promise<BatchItemResult>;
}

/** @public */
export interface BfetchServerSetup {
  addBatchProcessingRoute: <BatchItemData extends object, BatchItemResult extends object>(
    path: string,
    handler: (request: KibanaRequest) => BatchProcessingRouteParams<BatchItemData, BatchItemResult>
  ) => void;
  addStreamingResponseRoute: <Payload, Response>(
    path: string,
    params: (request: KibanaRequest) => StreamingResponseHandler<Payload, Response>
  ) => void;
  /**
   * Create a streaming request handler to be able to use an Observable to return chunked content to the client.
   * This is meant to be used with the `fetchStreaming` API of the `bfetch` client-side plugin.
   *
   * @example
   * ```ts
   * setup({ http }: CoreStart, { bfetch }: SetupDeps) {
   *   const router = http.createRouter();
   *   router.post(
   *   {
   *     path: '/api/my-plugin/stream-endpoint,
   *     validate: {
   *       body: schema.object({
   *         term: schema.string(),
   *       }),
   *     }
   *   },
   *   bfetch.createStreamingResponseHandler(async (ctx, req) => {
   *     const { term } = req.body;
   *     const results$ = await myApi.getResults$(term);
   *     return results$;
   *   })
   * )}
   *
   * ```
   *
   * @param streamHandler
   */
  createStreamingRequestHandler: <
    Response,
    P,
    Q,
    B,
    Context extends RequestHandlerContext = RequestHandlerContext,
    Method extends RouteMethod = any
  >(
    streamHandler: StreamingRequestHandler<Response, P, Q, B, Method>
  ) => RequestHandler<P, Q, B, Context, Method>;
}

// eslint-disable-next-line
export interface BfetchServerStart {}
