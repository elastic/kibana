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
      const esPath = req.url;
      const esMethod = req.method;
      let esData = collapseLiteralStrings(req.data.join('\n'));
      if (esData) {
        esData += '\n';
      } // append a new line for bulk requests.

      const startTime = Date.now();

      try {
        const { response, body } = await es.send({
          method: esMethod,
          path: esPath,
          data: esData,
          asResponse: true,
        });

        if (reqId !== CURRENT_REQ_ID) {
          return;
        }

        if (response) {
          const isSuccess =
            // Things like DELETE index where the index is not there are OK.
            (response.status >= 200 && response.status < 300) || response.status === 404;

          if (isSuccess) {
            let value = JSON.stringify(body, null, 2);

            const warnings = response.headers.get('warning');
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
                statusCode: response.status,
                statusText: response.statusText,
                contentType: response.headers.get('Content-Type') as BaseResponseType,
                value,
              },
              request: {
                data: esData,
                method: esMethod,
                path: esPath,
              },
            });

            // single request terminate via sendNextRequest as well
            await sendNextRequest();
          }
        }
      } catch (error) {
        let value;
        let contentType = '';
        if (!error) {
          value =
            "\n\nFailed to connect to Console's backend.\nPlease check the Kibana server is up and running";
        }

        if (error.response) {
          const { status, headers } = error.response;

          if (error.body) {
            value = JSON.stringify(error.body, null, 2); // ES error should be shown
            contentType = headers.get('Content-Type');
          } else {
            value = 'Request failed to get to the server (status code: ' + status + ')';
            contentType = headers.get('Content-Type');
          }

          if (isMultiRequest) {
            value = '# ' + req.method + ' ' + req.url + '\n' + value;
          }
        }

        reject({
          response: {
            value,
            contentType,
            timeMs: Date.now() - startTime,
            statusCode: error?.response?.status ?? 0,
            statusText: error?.response?.statusText ?? 'error',
          },
          request: {
            data: esData,
            method: esMethod,
            path: esPath,
          },
        });
      }
    };

    sendNextRequest();
  });
}
