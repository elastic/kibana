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
import { Transport } from '@elastic/transport';
import { kHeaders } from '@elastic/transport/lib/symbols';
import type { AuthHeaders } from '../../http';
import { isUnauthorizedError } from './errors';
import { InternalUnauthorizedErrorHandler, isRetryResult } from './retry_unauthorized';

type TransportClass = typeof Transport;

const noop = () => undefined;

export interface KibanaTransport {
  updateHeaders(headers: AuthHeaders): void;
}

export const createTransport = ({
  getExecutionContext = noop,
  unauthorizedErrorHandler,
}: {
  getExecutionContext?: () => string | undefined;
  unauthorizedErrorHandler?: InternalUnauthorizedErrorHandler;
}): TransportClass => {
  class KibanaTransportImpl extends Transport {
    async request(params: TransportRequestParams, options?: TransportRequestOptions) {
      const opts: TransportRequestOptions = options || {};
      const opaqueId = getExecutionContext();
      if (opaqueId && !opts.opaqueId) {
        // rewrites headers['x-opaque-id'] if it presents
        opts.opaqueId = opaqueId;
      }
      // Enforce the client to return TransportResult.
      // It's required for bwc with responses in 7.x version.
      if (opts.meta === undefined) {
        opts.meta = true;
      }

      try {
        return (await super.request(params, opts)) as TransportResult<any, any>;
      } catch (e) {
        if (isUnauthorizedError(e) && unauthorizedErrorHandler) {
          const result = await unauthorizedErrorHandler(e);
          if (isRetryResult(result)) {
            const headers = result.authHeaders;
            this.updateHeaders(headers);
            return (await super.request(params, opts)) as TransportResult<any, any>;
          }
        }
        throw e;
      }
    }

    updateHeaders(headers: AuthHeaders) {
      this[kHeaders] = { ...this[kHeaders], ...(headers as IncomingHttpHeaders) };
    }
  }

  return KibanaTransportImpl;
};
