/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup, IHttpFetchError } from '@kbn/core-http-browser';
import { XJson } from '@kbn/es-ui-shared-plugin/public';
import { KIBANA_API_PREFIX } from '../../../../common/constants';
import { extractWarningMessages } from '../../../lib/utils';
import { send } from '../../../lib/es/es';
import { BaseResponseType } from '../../../types';

const { collapseLiteralStrings } = XJson;

export interface RequestArgs {
  http: HttpSetup;
  requests: Array<{ url: string; method: string; data: string[]; lineNumber?: number }>;
}

export interface ResponseObject<V = unknown> {
  statusCode: number;
  statusText: string;
  timeMs: number;
  contentType: BaseResponseType;
  value: V;
}

export interface RequestResult<V = unknown> {
  request: { data: string; method: string; path: string };
  response: ResponseObject<V>;
}

const getContentType = (response: Response | undefined) =>
  (response?.headers.get('Content-Type') as BaseResponseType) ?? '';

const extractStatusCodeAndText = (response: Response | undefined, path: string) => {
  const isKibanaApiRequest = path.startsWith(KIBANA_API_PREFIX);
  // Kibana API requests don't go through the proxy, so we can use the response status code and text.
  if (isKibanaApiRequest) {
    return {
      statusCode: response?.status ?? 500,
      statusText: response?.statusText ?? 'error',
    };
  }

  // For ES requests, we need to extract the status code and text from the response
  // headers, due to the way the proxy set up to avoid mirroring the status code which could be 401
  // and trigger a login prompt. See for more details: https://github.com/elastic/kibana/issues/140536
  const statusCode = parseInt(response?.headers.get('x-console-proxy-status-code') ?? '500', 10);
  const statusText = response?.headers.get('x-console-proxy-status-text') ?? 'error';

  return { statusCode, statusText };
};

let CURRENT_REQ_ID = 0;
export function sendRequest(args: RequestArgs): Promise<RequestResult[]> {
  const requests = args.requests.slice();
  return new Promise((resolve, reject) => {
    const reqId = ++CURRENT_REQ_ID;
    const results: RequestResult[] = [];
    if (reqId !== CURRENT_REQ_ID) {
      return;
    }

    if (requests.length === 0) {
      return;
    }

    const isMultiRequest = requests.length > 1;

    const sendNextRequest = async () => {
      if (reqId !== CURRENT_REQ_ID) {
        resolve(results);
        return;
      }
      if (requests.length === 0) {
        resolve(results);
        return;
      }
      const req = requests.shift()!;
      const path = req.url;
      const method = req.method;

      // If the request data contains multiple data objects (e.g. bulk request)
      // ES only accepts it if each object is on a single line
      // Therefore, we need to remove all new line characters from each data object
      const unformattedData = req.data.map((body) => body.replaceAll('\n', ''));

      let data = collapseLiteralStrings(unformattedData.join('\n'));
      if (data) {
        data += '\n';
      } // append a new line for bulk requests.

      const startTime = Date.now();

      try {
        const { response, body } = await send({
          http: args.http,
          method,
          path,
          data,
          asResponse: true,
        });

        const { statusCode, statusText } = extractStatusCodeAndText(response, path);

        if (reqId !== CURRENT_REQ_ID) {
          // Skip if previous request is not resolved yet. This can happen when issuing multiple requests at the same time and with slow networks
          return;
        }

        if (response) {
          let value;
          // check if object is ArrayBuffer
          if (body instanceof ArrayBuffer) {
            value = body;
          } else {
            value = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
          }

          const warnings = response.headers.get('warning');
          if (warnings) {
            const warningMessages = extractWarningMessages(warnings);
            value = warningMessages.join('\n') + '\n' + value;
          }

          if (isMultiRequest) {
            const lineNumber = req.lineNumber ? `${req.lineNumber}: ` : '';
            value = `# ${lineNumber}${req.method} ${req.url} [${statusCode} ${statusText}]\n${value}`;
          }

          results.push({
            response: {
              timeMs: Date.now() - startTime,
              statusCode,
              statusText,
              contentType: getContentType(response),
              value,
            },
            request: {
              data,
              method,
              path,
            },
          });

          // single request terminate via sendNextRequest as well
          await sendNextRequest();
        }
      } catch (error) {
        let value;
        const { response, body } = error as IHttpFetchError;

        const { statusCode, statusText } = extractStatusCodeAndText(response, path);

        // When the request is sent, the HTTP library tries to parse the response body as JSON.
        // However, if the response body is empty or not in valid JSON format, it throws an error.
        // To handle this, if the request resolves with a 200 status code but has an empty or invalid body,
        // we should still display a success message to the user.
        if (statusCode === 200 && body === null) {
          value = 'OK';
        } else {
          if (body) {
            value = JSON.stringify(body, null, 2);
          } else {
            value = 'Request failed to get to the server (status code: ' + statusCode + ')';
          }
        }

        if (isMultiRequest) {
          const lineNumber = req.lineNumber ? `${req.lineNumber}: ` : '';
          value = `# ${lineNumber}${req.method} ${req.url} [${statusCode} ${statusText}]\n${value}`;
        }

        const result = {
          response: {
            value,
            contentType: getContentType(response),
            timeMs: Date.now() - startTime,
            statusCode,
            statusText,
          },
          request: {
            data,
            method,
            path,
          },
        };

        // Reject on unknown errors
        if (!response) {
          reject(result);
        }

        // Add error to the list of results
        results.push(result);
        await sendNextRequest();
      }
    };

    sendNextRequest();
  });
}
