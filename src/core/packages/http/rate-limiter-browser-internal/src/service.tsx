/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreService } from '@kbn/core-base-browser-internal';
import type { FatalError, FatalErrorsSetup } from '@kbn/core-fatal-errors-browser';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import { rateLimiterInterceptor } from './interceptor';
import { RateLimiterError } from './error';
import { isRateLimiterError } from './utils';

/** @internal */
export interface SetupDeps {
  fatalErrors: FatalErrorsSetup;
  http: InternalHttpSetup;
}

/** @internal */
export type InternalRateLimiterSetup = void;

/** @internal */
export type InternalRateLimiterStart = void;

/** @internal */
export class HttpRateLimiterService
  implements CoreService<InternalRateLimiterSetup, InternalRateLimiterStart>
{
  public setup({ http, fatalErrors }: SetupDeps): InternalRateLimiterSetup {
    fatalErrors.catch(
      (error): error is FatalError<IHttpFetchError> => isRateLimiterError(error.error),
      ([{ error }]) => <RateLimiterError error={error} />
    );
    http.intercept(rateLimiterInterceptor);
  }

  public start(): InternalRateLimiterStart {}

  public stop(): void {}
}
