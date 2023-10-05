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
            signal: abortSignal,
            meta: true,
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
