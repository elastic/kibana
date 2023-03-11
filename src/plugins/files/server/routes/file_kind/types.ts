/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter, RequestHandler } from '@kbn/core/server';
import { AnyEndpoint } from '../api_routes';
import type { FilesRequestHandlerContext } from '../types';

export type FileKindRouter = IRouter<FileKindsRequestHandlerContext>;

export interface FileKindsRequestHandlerContext extends FilesRequestHandlerContext {
  fileKind: string;
}

export type FileKindsRequestHandler<P = unknown, Q = unknown, B = unknown> = RequestHandler<
  P,
  Q,
  B,
  FileKindsRequestHandlerContext
>;

export type CreateHandler<E extends AnyEndpoint> = FileKindsRequestHandler<
  E['inputs']['params'],
  E['inputs']['query'],
  E['inputs']['body']
>;
