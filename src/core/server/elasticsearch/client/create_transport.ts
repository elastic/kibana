/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IncomingHttpHeaders } from 'http';
import type {
  TransportRequestParams,
  TransportRequestOptions,
  TransportResult,
} from '@elastic/transport';
import type { TransportOptions } from '@elastic/transport/lib/Transport';
import { Transport } from '@elastic/elasticsearch';
import { isUnauthorizedError } from './errors';
import { InternalUnauthorizedErrorHandler, isRetryResult } from './retry_unauthorized';

type TransportClass = typeof Transport;

export type ErrorHandlerAccessor = () => InternalUnauthorizedErrorHandler;

const noop = () => undefined;

export const createTransport = ({
  getExecutionContext = noop,
  getUnauthorizedErrorHandler,
}: {
  getExecutionContext?: () => string | undefined;
  getUnauthorizedErrorHandler?: ErrorHandlerAccessor;
}): TransportClass => {
  class KibanaTransport extends Transport {
    private headers: IncomingHttpHeaders = {};

    constructor(options: TransportOptions) {
      const { headers = {}, ...otherOptions } = options;
      super(otherOptions);
      this.headers = headers;
    }

    async request(params: TransportRequestParams, options?: TransportRequestOptions) {
      const opts: TransportRequestOptions = options ? { ...options } : {};
      const opaqueId = getExecutionContext();
      if (opaqueId && !opts.opaqueId) {
        // rewrites headers['x-opaque-id'] if it presents
        opts.opaqueId = opaqueId;
      }

      // add stored headers to the options
      opts.headers = {
        ...this.headers,
        ...options?.headers,
      };

      try {
        return (await super.request(params, opts)) as TransportResult<any, any>;
      } catch (e) {
        if (isUnauthorizedError(e)) {
          const unauthorizedErrorHandler = getUnauthorizedErrorHandler
            ? getUnauthorizedErrorHandler()
            : undefined;
          if (unauthorizedErrorHandler) {
            const result = await unauthorizedErrorHandler(e);
            if (isRetryResult(result)) {
              this.headers = {
                ...this.headers,
                ...result.authHeaders,
              };
              const retryOpts = { ...opts };
              retryOpts.headers = {
                ...this.headers,
                ...options?.headers,
              };
              return (await super.request(params, retryOpts)) as TransportResult<any, any>;
            }
          }
        }
        throw e;
      }
    }
  }

  return KibanaTransport;
};
