/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { from } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import { getKbnSearchError, KbnSearchError } from '../../report_search_error';
import type { ISearchStrategy } from '../../types';
import { sanitizeRequestParams } from '../../sanitize_request_params';

export const esqlSearchStrategyProvider = (
  logger: Logger,
  useInternalUser: boolean = false
): ISearchStrategy<any, any> => ({
  /**
   * @param request
   * @param options
   * @param deps
   * @throws `KbnSearchError`
   * @returns `Observable<IEsSearchResponse<any>>`
   */
  search: (request, { abortSignal, ...options }, { esClient, uiSettingsClient }) => {
    // Only default index pattern type is supported here.
    // See ese for other type support.
    if (request.indexType) {
      throw new KbnSearchError(`Unsupported index pattern type ${request.indexType}`, 400);
    }

    const search = async () => {
      try {
        const { terminateAfter, ...requestParams } = request.params ?? {};
        const { headers, body, meta } = await esClient.asCurrentUser.transport.request(
          {
            method: 'POST',
            path: '/_query',
            body: {
              ...requestParams,
            },
          },
          {
            signal: abortSignal,
            meta: true,
            // we don't want the ES client to retry (default value is 3)
            maxRetries: 0,
            requestTimeout: options.transport?.requestTimeout,
          }
        );
        return {
          rawResponse: body,
          isPartial: false,
          isRunning: false,
          ...(meta?.request?.params
            ? { requestParams: sanitizeRequestParams(meta?.request?.params) }
            : {}),
          warning: headers?.warning,
        };
      } catch (e) {
        throw getKbnSearchError(e);
      }
    };

    return from(search());
  },
});
