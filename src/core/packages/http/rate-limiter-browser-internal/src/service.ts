/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreService } from '@kbn/core-base-browser-internal';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import { isHttpFetchError } from '@kbn/core-http-browser';

/** @internal */
export interface SetupDeps {
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
  public setup({ http }: SetupDeps): InternalRateLimiterSetup {
    http.intercept({
      async fetch(next, options, controller) {
        for (let attempt = 1; ; attempt++) {
          try {
            return await next(options);
          } catch (error) {
            if (attempt >= 3 || !isHttpFetchError(error)) {
              throw error;
            }

            const retryAfter = error.response?.headers.get('Retry-After');
            const timeout = (retryAfter ? parseInt(retryAfter, 10) : 0) * 1000;
            await new Promise((resolve) => setTimeout(resolve, timeout));

            if (controller.halted) {
              throw error;
            }
          }
        }
      },
    });
  }

  public start(): InternalRateLimiterStart {}

  public stop(): void {}
}
