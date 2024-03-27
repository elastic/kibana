/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  HttpResponsePayload,
  IKibanaResponse,
  IRouter,
  KibanaResponseFactory,
  Logger,
  RequestHandler,
  RequestHandlerContext,
  ResponseError,
  RouteMethod,
} from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { FileServiceStart } from '../file_service';
import { Counters } from '../usage';
import { AnyEndpoint } from './api_routes';

export interface FilesRequestHandlerContext extends RequestHandlerContext {
  files: Promise<{
    security?: SecurityPluginStart;
    fileService: {
      asCurrentUser: () => FileServiceStart;
      asInternalUser: () => FileServiceStart;
      logger: Logger;
      usageCounter?: (counter: Counters) => void;
    };
  }>;
}

export type FilesRouter = IRouter<FilesRequestHandlerContext>;

export type FilesRequestHandler<
  P = unknown,
  Q = unknown,
  B = unknown,
  Method extends RouteMethod = any
> = RequestHandler<P, Q, B, FilesRequestHandlerContext, Method, KibanaResponseFactory>;

export type AsyncResponse<T extends HttpResponsePayload | ResponseError = any> = Promise<
  IKibanaResponse<T>
>;

export type CreateHandler<E extends AnyEndpoint> = FilesRequestHandler<
  E['inputs']['params'],
  E['inputs']['query'],
  E['inputs']['body']
>;
