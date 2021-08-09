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
import type { IExecutionContextContainer } from '../../execution_context';
import { Logger } from '../../logging';
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
    getExecutionContext?: () => IExecutionContextContainer | undefined;
  }
): Client => {
  const clientOptions = parseClientOptions(config, scoped);
  class KibanaTransport extends Transport {
    request(params: TransportRequestParams, options?: TransportRequestOptions) {
      const opts = options || {};
      const opaqueId = getExecutionContext()?.toString();
      if (opaqueId && !opts.opaqueId) {
        // rewrites headers['x-opaque-id'] if it presents
        opts.opaqueId = opaqueId;
      }
      return super.request(params, opts);
    }
  }

  const client = new Client({ ...clientOptions, Transport: KibanaTransport });
  addLogging(client, logger.get('query', type));

  // ------------------------------------------------------------------------ //
  // Hack to disable the "Product check" while the bugs in                    //
  // https://github.com/elastic/kibana/issues/105557 are handled.             //
  skipProductCheck(client);
  // ------------------------------------------------------------------------ //

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

function getErrorMessage(error: ApiError, event: RequestEvent): string {
  if (error instanceof errors.ResponseError) {
    return `${getResponseMessage(event)} [${event.body?.error?.type}]: ${
      event.body?.error?.reason ?? error.message
    }`;
  }
  return `[${error.name}]: ${error.message}`;
}

/**
 * returns a string in format:
 *
 * status code
 * URL
 * request body
 *
 * so it could be copy-pasted into the Dev console
 */
function getResponseMessage(event: RequestEvent): string {
  const params = event.meta.request.params;

  // definition is wrong, `params.querystring` can be either a string or an object
  const querystring = convertQueryString(params.querystring);
  const url = `${params.path}${querystring ? `?${querystring}` : ''}`;
  const body = params.body ? `\n${ensureString(params.body)}` : '';
  return `${event.statusCode}\n${params.method} ${url}${body}`;
}

const addLogging = (client: Client, logger: Logger) => {
  client.on('response', (error, event) => {
    if (event) {
      const opaqueId = event.meta.request.options.opaqueId;
      const meta = opaqueId
        ? {
            http: { request: { id: event.meta.request.options.opaqueId } },
          }
        : undefined; // do not clutter logs if opaqueId is not present
      if (error) {
        logger.debug(getErrorMessage(error, event), meta);
      } else {
        logger.debug(getResponseMessage(event), meta);
      }
    }
  });
};

/**
 * Hack to skip the Product Check performed by the Elasticsearch-js client.
 * We noticed a couple of bugs that may need to be fixed before taking full
 * advantage of this feature.
 *
 * The bugs are detailed in this issue: https://github.com/elastic/kibana/issues/105557
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
