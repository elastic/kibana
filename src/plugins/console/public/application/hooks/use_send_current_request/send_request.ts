/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpSetup, IHttpFetchError } from '@kbn/core-http-browser';
import { XJson } from '@kbn/es-ui-shared-plugin/public';
import { extractWarningMessages } from '../../../lib/utils';
import { send } from '../../../lib/es/es';
import { BaseResponseType } from '../../../types';

const { collapseLiteralStrings } = XJson;

export interface RequestArgs {
  http: HttpSetup;
  requests: Array<{ url: string; method: string; data: string[] }>;
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
      let data = collapseLiteralStrings(req.data.join('\n'));
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

        if (reqId !== CURRENT_REQ_ID) {
          // Skip if previous request is not resolved yet. This can happen when issuing multiple requests at the same time and with slow networks
          return;
        }

        if (response) {
          const isSuccess =
            // Things like DELETE index where the index is not there are OK.
            (response.status >= 200 && response.status < 300) || response.status === 404;

          if (isSuccess) {
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
              value = `# ${req.method} ${req.url} ${response.status} ${response.statusText}\n${value}`;
            }

            results.push({
              response: {
                timeMs: Date.now() - startTime,
                statusCode: response.status,
                statusText: response.statusText,
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
        }
      } catch (error) {
        let value;
        const { response, body } = error as IHttpFetchError;
        const statusCode = response?.status ?? 500;
        const statusText = response?.statusText ?? 'error';

        if (body) {
          value = JSON.stringify(body, null, 2);
        } else {
          value = 'Request failed to get to the server (status code: ' + statusCode + ')';
        }

        if (isMultiRequest) {
          value = `# ${req.method} ${req.url} ${statusCode} ${statusText}\n${value}`;
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
