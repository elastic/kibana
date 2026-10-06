/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  IKibanaResponse,
  HttpResponsePayload,
  ResponseError,
  HttpResponseOptions,
  FileHttpResponseOptions,
  KibanaResponseFactory,
  LifecycleResponseFactory,
} from '@kbn/core-http-server';
/**
 * A response data object, expected to returned as a result of {@link RequestHandler} execution
 * @internal
 */
export declare class KibanaResponse<T extends HttpResponsePayload | ResponseError = any>
  implements IKibanaResponse<T>
{
  readonly status: number;
  readonly payload?: T | undefined;
  readonly options: HttpResponseOptions;
  constructor(status: number, payload?: T | undefined, options?: HttpResponseOptions);
}
export declare const fileResponseFactory: {
  file: <T extends HttpResponsePayload | ResponseError>(
    options: FileHttpResponseOptions<T>
  ) => KibanaResponse<Buffer<ArrayBuffer> | NonNullable<T>>;
};
export declare const kibanaResponseFactory: KibanaResponseFactory;
export declare const lifecycleResponseFactory: LifecycleResponseFactory;
