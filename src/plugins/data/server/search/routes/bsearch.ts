/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { catchError, first } from 'rxjs/operators';
import { BfetchServerSetup } from 'src/plugins/bfetch/server';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '../../../common/search';
import { ISearchStart } from '../types';

export function registerBsearchRoute(
  bfetch: BfetchServerSetup,
  getScoped: ISearchStart['asScoped']
): void {
  bfetch.addBatchProcessingRoute<
    { request: IKibanaSearchRequest; options?: ISearchOptions },
    IKibanaSearchResponse
  >('/internal/bsearch', (request) => {
    return {
      /**
       * @param requestOptions
       * @throws `KibanaServerError`
       */
      onBatchItem: async ({ request: requestData, options }) => {
        const search = getScoped(request);
        return search
          .search(requestData, options)
          .pipe(
            first(),
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
          .toPromise();
      },
    };
  });
}
