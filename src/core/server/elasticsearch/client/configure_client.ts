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
  addLogging({ client, logger, type });

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

const addLogging = ({ client, type, logger }: { client: Client; type: string; logger: Logger }) => {
  const queryLogger = logger.get('query', type);
  const deprecationLogger = logger.get('deprecation', type);
  client.diagnostic.on('response', (error, event) => {
    if (event) {
      const opaqueId = event.meta.request.options.opaqueId;
      const meta = opaqueId
        ? {
            http: { request: { id: event.meta.request.options.opaqueId } },
          }
        : undefined; // do not clutter logs if opaqueId is not present
      let queryMessage = '';
      if (error) {
        if (error instanceof errors.ResponseError) {
          queryMessage = `${getResponseMessage(event)} ${getErrorMessage(error)}`;
        } else {
          queryMessage = getErrorMessage(error);
        }
      } else {
        queryMessage = getResponseMessage(event);
      }

      queryLogger.debug(queryMessage, meta);

      if (event.warnings && event.warnings.length > 0) {
        // Plugins can explicitly mark requests as originating from a user by
        // removing the `'x-elastic-product-origin': 'kibana'` header that's
        // added by default. User requests will be shown to users in the
        // upgrade assistant UI as an action item that has to be addressed
        // before they upgrade.
        // Kibana requests will be hidden from the upgrade assistant UI and are
        // only logged to help developers maintain their plugins
        const requestOrigin =
          (event.meta.request.options.headers != null &&
            (event.meta.request.options.headers[
              'x-elastic-product-origin'
            ] as unknown as string)) === 'kibana'
            ? 'kibana'
            : 'user';

        // Strip the first 5 stack trace lines as these are irrelavent to finding the call site
        const stackTrace = new Error().stack?.split('\n').slice(5).join('\n');

        if (requestOrigin === 'kibana') {
          deprecationLogger.warn(
            `Elasticsearch deprecation: ${event.warnings}\nOrigin:${requestOrigin}\nStack trace:\n${stackTrace}\nQuery:\n${queryMessage}`
          );
        } else {
          deprecationLogger.debug(
            `Elasticsearch deprecation: ${event.warnings}\nOrigin:${requestOrigin}\nStack trace:\n${stackTrace}\nQuery:\n${queryMessage}`
          );
        }
      }
    }
  });
};
