/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IHttpFetchError } from './types';

/** @internal */
export class HttpFetchError extends Error implements IHttpFetchError {
  public readonly name: string;
  public readonly req: Request;
  public readonly res?: Response;

  constructor(
    message: string,
    name: string,
    public readonly request: Request,
    public readonly response?: Response,
    public readonly body?: any
  ) {
    super(message);
    this.name = name;
    this.req = request;
    this.res = response;

    // captureStackTrace is only available in the V8 engine, so any browser using
    // a different JS engine won't have access to this method.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpFetchError);
    }
  }
}
