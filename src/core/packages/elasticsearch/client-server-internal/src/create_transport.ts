/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IncomingHttpHeaders } from 'http';
import {
  Transport,
  errors,
  type TransportOptions,
  type TransportRequestParams,
  type TransportRequestOptions,
  type TransportResult,
} from '@elastic/elasticsearch';
import { isUnauthorizedError } from '@kbn/es-errors';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InternalUnauthorizedErrorHandler } from './retry_unauthorized';
import { isRetryResult } from './retry_unauthorized';

/**
 * Timing context stored in Transport request options for instrumentation
 * @internal
 */
export interface TimingContext {
  startTime: number;
  kibanaRequest: KibanaRequest;
}

/**
 * Extended context type for Transport request options
 * @internal
 */
export interface TransportContext {
  cpsRoutingContext?: any;
  timingContext?: TimingContext;
}

type TransportClass = typeof Transport;

export type ErrorHandlerAccessor = () => InternalUnauthorizedErrorHandler;

export interface OnRequestContext {
  scoped: boolean;
}

export type OnRequestHandler = (
  ctx: OnRequestContext,
  params: TransportRequestParams,
  //  guaranteed to exist because the transport layer normalizes it before handler invocation
  options: TransportRequestOptions,
  logger: Logger
) => void;

const noop = () => undefined;

const isStreamBody = (body: unknown): body is NodeJS.ReadableStream => {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { pipe?: unknown }).pipe === 'function'
  );
};

const isUnauthorizedStreamResponse = (
  response: TransportResult<any, any>
): response is TransportResult<NodeJS.ReadableStream, any> & { statusCode: 401 } => {
  return response.statusCode === 401 && isStreamBody(response.body);
};

const readStreamBody = async (body: NodeJS.ReadableStream): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of body as AsyncIterable<Buffer | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
};

const createUnauthorizedStreamError = async (
  response: TransportResult<NodeJS.ReadableStream, any> & { statusCode: 401 }
) => {
  const responseBodyText = await readStreamBody(response.body);

  let responseBody: unknown;
  if (responseBodyText) {
    try {
      responseBody = JSON.parse(responseBodyText);
    } catch {
      responseBody = responseBodyText;
    }
  }

  return new errors.ResponseError({
    statusCode: response.statusCode,
    body: responseBody,
    headers: response.headers,
    warnings: response.warnings ?? [],
    meta: response.meta ?? ({} as any),
  });
};

export const createTransport = ({
  scoped = false,
  getExecutionContext = noop,
  getUnauthorizedErrorHandler,
  onRequest,
  logger,
}: {
  scoped?: boolean;
  getExecutionContext?: () => string | undefined;
  getUnauthorizedErrorHandler?: ErrorHandlerAccessor;
  onRequest: OnRequestHandler;
  logger: Logger;
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
      // sync override of maxResponseSize and maxCompressedResponseSize
      if (options) {
        if (
          options.maxResponseSize !== undefined &&
          options.maxCompressedResponseSize === undefined
        ) {
          opts.maxCompressedResponseSize = options.maxResponseSize;
        } else if (
          options.maxCompressedResponseSize !== undefined &&
          options.maxResponseSize === undefined
        ) {
          opts.maxResponseSize = options.maxCompressedResponseSize;
        }
      }
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

      onRequest({ scoped }, params, opts, logger);

      const retryUnauthorizedRequest = async (error: errors.ResponseError) => {
        const unauthorizedErrorHandler = getUnauthorizedErrorHandler
          ? getUnauthorizedErrorHandler()
          : undefined;
        if (unauthorizedErrorHandler) {
          const result = await unauthorizedErrorHandler(error);
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

            const retryResponse = (await super.request(params, retryOpts)) as TransportResult<
              any,
              any
            >;
            if (isUnauthorizedStreamResponse(retryResponse)) {
              throw await createUnauthorizedStreamError(retryResponse);
            }

            return retryResponse;
          }
        }

        throw error;
      };

      let response: TransportResult<any, any>;
      try {
        response = (await super.request(params, opts)) as TransportResult<any, any>;
      } catch (e) {
        if (isUnauthorizedError(e)) {
          return await retryUnauthorizedRequest(e);
        }

        throw e;
      }

      if (isUnauthorizedStreamResponse(response)) {
        return await retryUnauthorizedRequest(await createUnauthorizedStreamError(response));
      }

      return response;
    }
  }

  return KibanaTransport;
};
