/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BfetchServerSetup } from '@kbn/bfetch-plugin/server';
import type { ExecutionContextSetup } from '@kbn/core/server';
import apm from 'elastic-apm-node';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptionsSerializable,
} from '../../../common/search';
import type { ISearchStart } from '../types';

export function registerBsearchRoute(
  bfetch: BfetchServerSetup,
  getScoped: ISearchStart['asScoped'],
  executionContextService: ExecutionContextSetup
): void {
  bfetch.addBatchProcessingRoute<
    { request: IKibanaSearchRequest; options?: ISearchOptionsSerializable },
    IKibanaSearchResponse
  >('/internal/bsearch', (request) => {
    const search = getScoped(request);
    return {
      /**
       * @param requestOptions
       * @throws `KibanaServerError`
       */
      onBatchItem: async ({ request: requestData, options }) => {
        const { executionContext, ...restOptions } = options || {};
        return executionContextService.withContext(executionContext, () => {
          apm.addLabels(executionContextService.getAsLabels());

          return firstValueFrom(
            search.search(requestData, restOptions).pipe(
              catchError((err) => {
                // Re-throw as object, to get attributes passed to the client
                // eslint-disable-next-line no-throw-literal
                throw {
                  message: err.message,
                  statusCode: err.statusCode,
                  attributes: err.errBody?.error,
                };
              })
            )
          );
        });
      },
    };
  });
}
