/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Buffer } from 'buffer';
import { stringify } from 'querystring';
import { ApiError, Client, RequestEvent, errors } from '@elastic/elasticsearch';
import type { RequestBody } from '@elastic/elasticsearch/lib/Transport';
import { Logger } from '../../logging';
import { parseClientOptions, ElasticsearchClientConfig } from './client_config';

export const configureClient = (
  config: ElasticsearchClientConfig,
  { logger, scoped = false }: { logger: Logger; scoped?: boolean }
): Client => {
  const clientOptions = parseClientOptions(config, scoped);

  const client = new Client(clientOptions);
  addLogging(client, logger, config.logQueries);

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

const addLogging = (client: Client, logger: Logger, logQueries: boolean) => {
  client.on('response', (error, event) => {
    if (event && logQueries) {
      if (error) {
        logger.error(getErrorMessage(error, event));
      } else {
        logger.debug(getResponseMessage(event), {
          tags: ['query'],
        });
      }
    }
  });
};
