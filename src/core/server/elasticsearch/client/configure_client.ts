/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Buffer } from 'buffer';
import { stringify } from 'querystring';
import { ApiError, Client, RequestEvent, errors, Transport } from '@elastic/elasticsearch';
import type {
  RequestBody,
  TransportRequestParams,
  TransportRequestOptions,
} from '@elastic/elasticsearch/lib/Transport';

import { Logger, LogMeta } from '../../logging';
import { parseClientOptions, ElasticsearchClientConfig } from './client_config';

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
): Client => {
  const clientOptions = parseClientOptions(config, scoped);
  class KibanaTransport extends Transport {
    request(params: TransportRequestParams, options?: TransportRequestOptions) {
      const opts = options || {};
      const opaqueId = getExecutionContext();
      if (opaqueId && !opts.opaqueId) {
        // rewrites headers['x-opaque-id'] if it presents
        opts.opaqueId = opaqueId;
      }
      return super.request(params, opts);
    }
  }

  const client = new Client({ ...clientOptions, Transport: KibanaTransport });
  addLogging({ client, logger, type });

  // --------------------------------------------------------------------------------- //
  // Hack to disable the "Product check" only in the scoped clients while we           //
  // come up with a better approach in https://github.com/elastic/kibana/issues/110675 //
  if (scoped) skipProductCheck(client);
  // --------------------------------------------------------------------------------- //

  return client;
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
export function getErrorMessage(error: ApiError): string {
  if (error instanceof errors.ResponseError) {
    return `[${error.meta.body?.error?.type}]: ${error.meta.body?.error?.reason ?? error.message}`;
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
function getResponseMessage(event: RequestEvent): string {
  const errorMeta = getRequestDebugMeta(event);
  const body = errorMeta.body ? `\n${errorMeta.body}` : '';
  return `${errorMeta.statusCode}\n${errorMeta.method} ${errorMeta.url}${body}`;
}

/**
 * Returns stringified debug information from an Elasticsearch request event
 * useful for logging in case of an unexpected failure.
 */
export function getRequestDebugMeta(event: RequestEvent): {
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
    statusCode: event.statusCode,
  };
}

const addLogging = ({ client, type, logger }: { client: Client; type: string; logger: Logger }) => {
  const queryLogger = logger.get('query', type);
  const deprecationLogger = logger.get('deprecation', type);
  client.on('response', (error, event) => {
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

      if (event.headers.warning ?? false) {
        // Plugins can explicitly mark requests as originating from a user by
        // removing the `'x-elastic-product-origin': 'kibana'` header that's
        // added by default. User requests will be shown to users in the
        // upgrade assistant UI as an action item that has to be addressed
        // before they upgrade.
        // Kibana requests will be hidden from the upgrade assistant UI and are
        // only logged to help developers maintain their plugins
        const requestOrigin =
          (event.meta.request.params.headers != null &&
            (event.meta.request.params.headers['x-elastic-product-origin'] as unknown as string)) ??
          'user';

        const stackTrace = new Error().stack?.split('\n').slice(5).join('\n');

        // Construct a JSON logMeta payload to make it easier for CI tools to consume
        const logMeta = {
          deprecation: {
            message: event.headers.warning ?? 'placeholder',
            requestOrigin,
            query: queryMessage,
            stack: stackTrace,
          },
        };
        deprecationLogger.debug(
          `ES DEPRECATION: ${event.headers.warning}\nOrigin:${requestOrigin}\nStack trace:\n${stackTrace}\nQuery:\n${queryMessage}`,
          logMeta as unknown as LogMeta
        );
      }
    }
  });
};

/**
 * Hack to skip the Product Check performed by the Elasticsearch-js client.
 * We noticed that the scoped clients are always performing this check because
 * of the way we initialize the clients. We'll discuss changing this in the issue
 * https://github.com/elastic/kibana/issues/110675. In the meanwhile, let's skip
 * it for the scoped clients.
 *
 * The hack is copied from the test/utils in the elasticsearch-js repo
 * (https://github.com/elastic/elasticsearch-js/blob/master/test/utils/index.js#L45-L56)
 */
function skipProductCheck(client: Client) {
  const tSymbol = Object.getOwnPropertySymbols(client.transport || client).filter(
    (symbol) => symbol.description === 'product check'
  )[0];
  // @ts-expect-error `tSymbol` is missing in the index signature of Transport
  (client.transport || client)[tSymbol] = 2;
}
