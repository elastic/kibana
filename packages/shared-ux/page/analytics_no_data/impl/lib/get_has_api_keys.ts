/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsNoDataPageServices } from '@kbn/shared-ux-page-analytics-no-data-types';
import { of, Observable, catchError, from, map, startWith } from 'rxjs';

export interface HasApiKeysEndpointResponseData {
  hasApiKeys: boolean;
}

export interface HasApiKeysResponse {
  hasApiKeys: boolean | null;
  isLoading: boolean;
  error: Error | null;
}

const HAS_API_KEYS_ENDPOINT_PATH = '/internal/security/api_key/_has_active';

export const getHasApiKeys$ = ({
  get,
}: {
  get: AnalyticsNoDataPageServices['getHttp'];
}): Observable<HasApiKeysResponse> => {
  return from(get<HasApiKeysEndpointResponseData>(HAS_API_KEYS_ENDPOINT_PATH)).pipe(
    map((responseData) => {
      return {
        isLoading: false,
        hasApiKeys: responseData.hasApiKeys,
        error: null,
      };
    }),
    startWith({
      isLoading: true,
      hasApiKeys: null,
      error: null,
    }),
    // catch any errors
    catchError((error) => {
      // eslint-disable-next-line no-console
      console.error('Could not determine whether user has API keys:', error);

      return of({
        hasApiKeys: null,
        isLoading: false,
        error,
      });
    })
  );
};
