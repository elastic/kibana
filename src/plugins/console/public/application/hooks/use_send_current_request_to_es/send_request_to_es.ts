/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extractWarningMessages } from '../../../lib/utils';
import { XJson } from '../../../../../es_ui_shared/public';
// @ts-ignore
import * as es from '../../../lib/es/es';
import { BaseResponseType } from '../../../types';

const { collapseLiteralStrings } = XJson;

export interface EsRequestArgs {
  requests: Array<{ url: string; method: string; data: string[] }>;
}

export interface ESResponseObject<V = unknown> {
  statusCode: number;
  statusText: string;
  timeMs: number;
  contentType: BaseResponseType;
  value: V;
}

export interface ESRequestResult<V = unknown> {
  request: { data: string; method: string; path: string };
  response: ESResponseObject<V>;
}

let CURRENT_REQ_ID = 0;
export function sendRequestToES(args: EsRequestArgs): Promise<ESRequestResult[]> {
  const requests = args.requests.slice();
  return new Promise((resolve, reject) => {
    const reqId = ++CURRENT_REQ_ID;
    const results: ESRequestResult[] = [];
    if (reqId !== CURRENT_REQ_ID) {
      return;
    }

    if (requests.length === 0) {
      return;
    }

    const isMultiRequest = requests.length > 1;

    const sendNextRequest = () => {
      if (reqId !== CURRENT_REQ_ID) {
        resolve(results);
        return;
      }
      if (requests.length === 0) {
        resolve(results);
        return;
      }
      const req = requests.shift()!;
      const esPath = req.url;
      const esMethod = req.method;
      let esData = collapseLiteralStrings(req.data.join('\n'));
      if (esData) {
        esData += '\n';
      } // append a new line for bulk requests.

      const startTime = Date.now();
      es.send(esMethod, esPath, esData).always(
        (dataOrjqXHR, textStatus: string, jqXhrORerrorThrown) => {
          if (reqId !== CURRENT_REQ_ID) {
            return;
          }
          const xhr = dataOrjqXHR.promise ? dataOrjqXHR : jqXhrORerrorThrown;

          const isSuccess =
            typeof xhr.status === 'number' &&
            // Things like DELETE index where the index is not there are OK.
            ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 404);

          if (isSuccess) {
            let value = xhr.responseText;
            if (dataOrjqXHR.byteLength > 0) {
              value = dataOrjqXHR;
            }

            const warnings = xhr.getResponseHeader('warning');
            if (warnings) {
              const warningMessages = extractWarningMessages(warnings);
              value = warningMessages.join('\n') + '\n' + value;
            }

            if (isMultiRequest) {
              value = '# ' + req.method + ' ' + req.url + '\n' + value;
            }

            results.push({
              response: {
                timeMs: Date.now() - startTime,
                statusCode: xhr.status,
                statusText: xhr.statusText,
                contentType: xhr.getResponseHeader('Content-Type'),
                value,
              },
              request: {
                data: esData,
                method: esMethod,
                path: esPath,
              },
            });

            // single request terminate via sendNextRequest as well
            sendNextRequest();
          } else {
            let value;
            let contentType: string;
            if (xhr.responseText) {
              value = xhr.responseText; // ES error should be shown
              contentType = xhr.getResponseHeader('Content-Type');
            } else {
              value = 'Request failed to get to the server (status code: ' + xhr.status + ')';
              contentType = 'text/plain';
            }
            if (isMultiRequest) {
              value = '# ' + req.method + ' ' + req.url + '\n' + value;
            }
            reject({
              response: {
                value,
                contentType,
                timeMs: Date.now() - startTime,
                statusCode: xhr.status,
                statusText: xhr.statusText,
              },
              request: {
                data: esData,
                method: esMethod,
                path: esPath,
              },
            });
          }
        }
      );
    };

    sendNextRequest();
  });
}
