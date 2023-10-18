/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { from } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import { getKbnServerError, KbnServerError } from '@kbn/kibana-utils-plugin/server';
import type { ISearchStrategy } from '../../types';

const ES_TIMEOUT_IN_MS = 120000;

export const esqlSearchStrategyProvider = (
  logger: Logger,
  useInternalUser: boolean = false
): ISearchStrategy<any, any> => ({
  /**
   * @param request
   * @param options
   * @param deps
   * @throws `KbnServerError`
   * @returns `Observable<IEsSearchResponse<any>>`
   */
  search: (request, { abortSignal, ...options }, { esClient, uiSettingsClient }) => {
    const abortController = new AbortController();
    // We found out that there are cases where we are not aborting correctly
    // For this reasons we want to manually cancel he abort signal after 2 mins

    abortSignal?.addEventListener('abort', () => {
      abortController.abort();
    });

    // Also abort after two mins
    setTimeout(() => abortController.abort(), ES_TIMEOUT_IN_MS);

    // Only default index pattern type is supported here.
    // See ese for other type support.
    if (request.indexType) {
      throw new KbnServerError(`Unsupported index pattern type ${request.indexType}`, 400);
    }

    const search = async () => {
      try {
        const { terminateAfter, ...requestParams } = request.params ?? {};
        const { headers, body } = await esClient.asCurrentUser.transport.request(
          {
            method: 'POST',
            path: '/_query',
            body: {
              ...requestParams,
            },
          },
          {
            signal: abortController.signal,
            meta: true,
            // we don't want the ES client to retry (default value is 3)
            maxRetries: 0,
          }
        );
        return {
          rawResponse: body,
          isPartial: false,
          isRunning: false,
          warning: headers?.warning,
        };
      } catch (e) {
        throw getKbnServerError(e);
      }
    };

    return from(search());
  },
});
