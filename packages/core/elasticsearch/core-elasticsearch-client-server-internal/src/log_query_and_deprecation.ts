/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IncomingHttpHeaders } from 'http';
import { Buffer } from 'buffer';
import { stringify } from 'querystring';
import { errors, DiagnosticResult, RequestBody, Client } from '@elastic/elasticsearch';
import numeral from '@elastic/numeral';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchErrorDetails } from '@kbn/es-errors';
import type { ElasticsearchApiToRedactInLogs } from '@kbn/core-elasticsearch-server';
import { getEcsResponseLog } from './get_ecs_response_log';

/**
 * The logger-relevant request meta of an ES request
 */
export interface RequestDebugMeta {
  /**
   * The requested method
   */
  method: string;
  /**
   * The requested endpoint + querystring
   */
  url: string;
  /**
   * The request body (it may be redacted)
   */
  body: string;
  /**
   * The status code of the response
   */
  statusCode: number | null;
}

/**
 * Known list of APIs that should redact the request body in the logs
 */
const APIS_TO_REDACT_IN_LOGS: ElasticsearchApiToRedactInLogs[] = [
  { path: '/_security/' },
  { path: '/_xpack/security/' },
  { method: 'POST', path: '/_reindex' },
  { method: 'PUT', path: '/_watcher/watch' },
  { method: 'PUT', path: '/_xpack/watcher/watch' },
  { method: 'PUT', path: '/_snapshot/' },
  { method: 'PUT', path: '/_logstash/pipeline/' },
  { method: 'POST', path: '/_nodes/reload_secure_settings' },
  { method: 'POST', path: /\/_nodes\/.+\/reload_secure_settings/ },
];

function shouldRedactBodyInLogs(
  requestDebugMeta: RequestDebugMeta,
  extendedList: ElasticsearchApiToRedactInLogs[] = []
) {
  return [...APIS_TO_REDACT_IN_LOGS, ...extendedList].some(({ path, method }) => {
    if (!method || method === requestDebugMeta.method) {
      if (typeof path === 'string') {
        return requestDebugMeta.url.includes(path);
      } else {
        return path.test(requestDebugMeta.url);
      }
    }
    return false;
  });
}

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

function getContentLength(headers?: IncomingHttpHeaders): number | undefined {
  const contentLength = headers && headers['content-length'];
  if (contentLength) {
    const val = parseInt(contentLength, 10);
    return !isNaN(val) ? val : undefined;
  }
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
function getResponseMessage(
  event: DiagnosticResult,
  bytesMsg: string,
  apisToRedactInLogs: ElasticsearchApiToRedactInLogs[]
): string {
  const debugMeta = getRequestDebugMeta(event, apisToRedactInLogs);
  const body = debugMeta.body ? `\n${debugMeta.body}` : '';
  return `${debugMeta.statusCode}${bytesMsg}\n${debugMeta.method} ${debugMeta.url}${body}`;
}

/**
 * Returns stringified debug information from an Elasticsearch request event
 * useful for logging in case of an unexpected failure.
 */
export function getRequestDebugMeta(
  event: DiagnosticResult,
  apisToRedactInLogs?: ElasticsearchApiToRedactInLogs[]
): RequestDebugMeta {
  const params = event.meta.request.params;
  // definition is wrong, `params.querystring` can be either a string or an object
  const querystring = convertQueryString(params.querystring);

  const debugMeta: RequestDebugMeta = {
    url: `${params.path}${querystring ? `?${querystring}` : ''}`,
    body: params.body ? `${ensureString(params.body)}` : '',
    method: params.method,
    statusCode: event.statusCode!,
  };

  // Some known APIs may contain sensitive information in the request body that we don't want to expose to the logs.
  return shouldRedactBodyInLogs(debugMeta, apisToRedactInLogs)
    ? { ...debugMeta, body: '[redacted]' }
    : debugMeta;
}

/** HTTP Warning headers have the following syntax:
 * <warn-code> <warn-agent> <warn-text> (where warn-code is a three-digit number)
 * This function tests if a warning comes from an Elasticsearch warn-agent
 * */
const isEsWarning = (warning: string) => /\d\d\d Elasticsearch-/.test(warning);

function getQueryMessage(
  bytes: number | undefined,
  error: errors.ElasticsearchClientError | errors.ResponseError | null,
  event: DiagnosticResult<unknown, unknown>,
  apisToRedactInLogs: ElasticsearchApiToRedactInLogs[]
) {
  const bytesMsg = bytes ? ` - ${numeral(bytes).format('0.0b')}` : '';
  if (error) {
    if (error instanceof errors.ResponseError) {
      return `${getResponseMessage(event, bytesMsg, apisToRedactInLogs)} ${getErrorMessage(error)}`;
    } else {
      return getErrorMessage(error);
    }
  } else {
    return getResponseMessage(event, bytesMsg, apisToRedactInLogs);
  }
}

export const instrumentEsQueryAndDeprecationLogger = ({
  logger,
  client,
  type,
  apisToRedactInLogs,
}: {
  logger: Logger;
  client: Client;
  type: string;
  apisToRedactInLogs: ElasticsearchApiToRedactInLogs[];
}) => {
  const queryLogger = logger.get('query', type);
  const deprecationLogger = logger.get('deprecation');

  client.diagnostic.on('response', (error, event) => {
    // we could check this once and not subscribe to response events if both are disabled,
    // but then we would not be supporting hot reload of the logging configuration.
    const logQuery = queryLogger.isLevelEnabled('debug');
    const logDeprecation = deprecationLogger.isLevelEnabled('debug');

    if (event && (logQuery || logDeprecation)) {
      const bytes = getContentLength(event.headers);
      const queryMsg = getQueryMessage(bytes, error, event, apisToRedactInLogs);

      if (logQuery) {
        const meta = getEcsResponseLog(event, bytes);
        queryLogger.debug(queryMsg, meta);
      }

      if (logDeprecation && event.warnings && event.warnings.filter(isEsWarning).length > 0) {
        // Plugins can explicitly mark requests as originating from a user by
        // removing the `'x-elastic-product-origin': 'kibana'` header that's
        // added by default. User requests will be shown to users in the
        // upgrade assistant UI as an action item that has to be addressed
        // before they upgrade.
        // Kibana requests will be hidden from the upgrade assistant UI and are
        // only logged to help developers maintain their plugins
        const requestOrigin =
          (event.meta.request.params.headers != null &&
            (event.meta.request.params.headers[
              'x-elastic-product-origin'
            ] as unknown as string)) === 'kibana'
            ? 'kibana'
            : 'user';

        // Strip the first 5 stack trace lines as these are irrelevant to finding the call site
        const stackTrace = new Error().stack?.split('\n').slice(5).join('\n');

        deprecationLogger.debug(
          `Elasticsearch deprecation: ${event.warnings}\nOrigin:${requestOrigin}\nStack trace:\n${stackTrace}\nQuery:\n${queryMsg}`
        );
      }
    }
  });
};
