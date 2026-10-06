/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ResponseObject as HapiResponseObject,
  ResponseToolkit as HapiResponseToolkit,
} from '@hapi/hapi';
import type Boom from '@hapi/boom';
import type { KibanaResponse } from './response';
export declare class HapiResponseAdapter {
  private readonly responseToolkit;
  constructor(responseToolkit: HapiResponseToolkit);
  toBadRequest(message: string): Boom.Boom<unknown>;
  toInternalError(): Boom.Boom<any>;
  handle(kibanaResponse: KibanaResponse): Boom.Boom<any> | HapiResponseObject;
  private toHapiResponse;
  private toSuccess;
  private toRedirect;
  private toError;
}
