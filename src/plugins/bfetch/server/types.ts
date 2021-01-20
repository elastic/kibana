/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
import { KibanaRequest, RequestHandlerContext, RouteMethod } from 'kibana/server';

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
