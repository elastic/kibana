/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IncomingHttpHeaders } from 'http';
import { isReadable } from 'stream';
import {
  Transport,
  errors,
  type TransportOptions,
  type TransportRequestParams,
  type TransportRequestOptions,
  type TransportResult,
} from '@elastic/elasticsearch';
import { isUnauthorizedError } from '@kbn/es-errors';
import type { UnauthorizedError } from '@kbn/es-errors';
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

/**
 * Options for Kibana's extended `asStream` flag.
 * Pass as `asStream: { retryOn401: true }` to opt in to automatic
 * 401 retry handling for streamed responses. KibanaTransport normalizes
 * the value to `asStream: true` before forwarding to `@elastic/transport`.
 */
export interface KibanaAsStreamOptions {
  /**
   * When true, the transport will intercept streamed 401 responses,
   * read the error body, refresh auth tokens via the unauthorized error handler,
   * and retry the request with updated credentials.
   * Without this flag, streamed 401 responses are returned as-is to the caller.
   */
  retryOn401?: boolean;
}

const noop = () => undefined;

const isStreamBody = (body: unknown): body is NodeJS.ReadableStream => {
  return typeof body === 'object' && body !== null && !!isReadable(body as NodeJS.ReadableStream);
};

const isUnauthorizedStreamResponse = (
  response: TransportResult<unknown, unknown> | undefined
): response is TransportResult<NodeJS.ReadableStream, unknown> & { statusCode: 401 } => {
  return response != null && response.statusCode === 401 && isStreamBody(response.body);
};

const MAX_ERROR_BODY_BYTES = 64 * 1024;

const readStreamBody = async (body: NodeJS.ReadableStream, logger: Logger): Promise<string> => {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of body as AsyncIterable<Buffer | string>) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.byteLength;
    if (totalBytes > MAX_ERROR_BODY_BYTES) {
      chunks.push(buf);
      const partialBody = Buffer.concat(chunks).toString('utf8').slice(0, 1024);
      logger.warn(
        `Streamed 401 response body exceeded ${MAX_ERROR_BODY_BYTES} bytes (read ${totalBytes} so far), truncating. Partial body: "${partialBody}"`
      );
      // Release the underlying connection instead of abandoning a half-read stream.
      (body as { destroy?: () => void }).destroy?.();
      break;
    }
    chunks.push(buf);
  }

  return Buffer.concat(chunks).toString('utf8');
};

const createUnauthorizedStreamError = async (
  response: TransportResult<NodeJS.ReadableStream, any> & { statusCode: 401 },
  logger: Logger
): Promise<UnauthorizedError> => {
  let responseBody: unknown;
  try {
    const responseBodyText = await readStreamBody(response.body, logger);
    if (responseBodyText) {
      try {
        responseBody = JSON.parse(responseBodyText);
      } catch {
        responseBody = responseBodyText;
      }
    }
  } catch (e) {
    logger.warn(`Failed to read streamed 401 response body: ${e instanceof Error ? e.message : e}`);
  }

  return new errors.ResponseError({
    statusCode: response.statusCode,
    body: responseBody,
    headers: response.headers,
    warnings: response.warnings ?? [],
    meta: response.meta ?? ({} as any),
  }) as UnauthorizedError;
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

      // Extract retryOn401 from object-shaped asStream before normalizing
      let retryOn401 = false;
      if (opts.asStream != null && typeof opts.asStream === 'object') {
        retryOn401 = (opts.asStream as KibanaAsStreamOptions).retryOn401 === true;
        opts.asStream = true;
      }

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

      const retryUnauthorizedRequest = async (error: UnauthorizedError) => {
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
              throw await createUnauthorizedStreamError(retryResponse, logger);
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

      if (retryOn401 && isUnauthorizedStreamResponse(response)) {
        logger.debug(
          `Received streamed 401 response for [${params.method} ${params.path}]${
            opts.opaqueId ? ` (opaqueId: ${opts.opaqueId})` : ''
          }, attempting token refresh and retry`
        );
        return await retryUnauthorizedRequest(
          await createUnauthorizedStreamError(response, logger)
        );
      }

      return response;
    }
  }

  return KibanaTransport;
};
