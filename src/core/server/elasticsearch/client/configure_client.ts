/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Buffer } from 'buffer';
import { stringify } from 'querystring';
import { Client, errors, Transport, HttpConnection } from '@elastic/elasticsearch';
import type { KibanaClient } from '@elastic/elasticsearch/lib/api/kibana';
import type {
  TransportRequestParams,
  TransportRequestOptions,
  TransportResult,
  DiagnosticResult,
  RequestBody,
} from '@elastic/elasticsearch';

import { Logger } from '../../logging';
import { parseClientOptions, ElasticsearchClientConfig } from './client_config';
import type { ElasticsearchErrorDetails } from './types';

const noop = () => undefined;

export const configureClient = (
  config: ElasticsearchClientConfig,
  {
    logger,
    type,
    scoped = false,
    getExecutionContext = noop,
  }: {
    logger: Logger;
    type: string;
    scoped?: boolean;
    getExecutionContext?: () => string | undefined;
  }
): KibanaClient => {
  const clientOptions = parseClientOptions(config, scoped);
  class KibanaTransport extends Transport {
    request(params: TransportRequestParams, options?: TransportRequestOptions) {
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
      return super.request(params, opts) as Promise<TransportResult<any, any>>;
    }
  }

  const client = new Client({
    ...clientOptions,
    Transport: KibanaTransport,
    Connection: HttpConnection,
  });
  addLogging(client, logger.get('query', type));

  return client as KibanaClient;
};

const convertQueryString = (qs: string | Record<string, any> | undefined): string => {
  if (qs === undefined || typeof qs === 'string') {
    return qs ?? '';
  }
  return stringify(qs);
};

function ensureString(body: RequestBody): string {
  if (typeof body === 'string') return body;
  if (Buffer.isBuffer(body)) return '[buffer]';
  if ('readable' in body && body.readable && typeof body._read === 'function') return '[stream]';
  return JSON.stringify(body);
}

/**
 * Returns a debug message from an Elasticsearch error in the following format:
 * [error type] error reason
 */
export function getErrorMessage(error: errors.ElasticsearchClientError): string {
  if (error instanceof errors.ResponseError) {
    const errorBody = error.meta.body as ElasticsearchErrorDetails;
    return `[${errorBody?.error?.type}]: ${errorBody?.error?.reason ?? error.message}`;
  }
  return `[${error.name}]: ${error.message}`;
}

/**
 * returns a string in format:
 *
 * status code
 * method URL
 * request body
 *
 * so it could be copy-pasted into the Dev console
 */
function getResponseMessage(event: DiagnosticResult): string {
  const errorMeta = getRequestDebugMeta(event);
  const body = errorMeta.body ? `\n${errorMeta.body}` : '';
  return `${errorMeta.statusCode}\n${errorMeta.method} ${errorMeta.url}${body}`;
}

/**
 * Returns stringified debug information from an Elasticsearch request event
 * useful for logging in case of an unexpected failure.
 */
export function getRequestDebugMeta(event: DiagnosticResult): {
  url: string;
  body: string;
  statusCode: number | null;
  method: string;
} {
  const params = event.meta.request.params;
  // definition is wrong, `params.querystring` can be either a string or an object
  const querystring = convertQueryString(params.querystring);
  return {
    url: `${params.path}${querystring ? `?${querystring}` : ''}`,
    body: params.body ? `${ensureString(params.body)}` : '',
    method: params.method,
    statusCode: event.statusCode!,
  };
}

const addLogging = (client: Client, logger: Logger) => {
  client.diagnostic.on('response', (error, event) => {
    if (event) {
      const opaqueId = event.meta.request.options.opaqueId;
      const meta = opaqueId
        ? {
            http: { request: { id: event.meta.request.options.opaqueId } },
          }
        : undefined; // do not clutter logs if opaqueId is not present
      if (error) {
        if (error instanceof errors.ResponseError) {
          logger.debug(`${getResponseMessage(event)} ${getErrorMessage(error)}`, meta);
        } else {
          logger.debug(getErrorMessage(error), meta);
        }
      } else {
        logger.debug(getResponseMessage(event), meta);
      }
    }
  });
};
