/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defer, map, retry, timer, firstValueFrom, throwError } from 'rxjs';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { isRetryableEsClientError } from './retryable_es_client_errors';

const scriptAllowedTypesKey = 'script.allowed_types';

export const isInlineScriptingEnabled = async ({
  client,
  maxRetries = 20,
  maxRetryDelay = 64,
}: {
  client: ElasticsearchClient;
  maxRetries?: number;
  maxRetryDelay?: number;
}): Promise<boolean> => {
  return firstValueFrom(
    defer(() => {
      return client.cluster.getSettings({
        include_defaults: true,
        flat_settings: true,
      });
    }).pipe(
      retry({
        count: maxRetries,
        delay: (error, retryIndex) => {
          if (isRetryableEsClientError(error)) {
            const retryDelay = 1000 * Math.min(Math.pow(2, retryIndex), maxRetryDelay); // 2s, 4s, 8s, 16s, 32s, 64s, 64s, 64s ...
            return timer(retryDelay);
          } else {
            return throwError(error);
          }
        },
      }),
      map((settings) => {
        const scriptAllowedTypes: string[] =
          settings.transient[scriptAllowedTypesKey] ??
          settings.persistent[scriptAllowedTypesKey] ??
          settings.defaults![scriptAllowedTypesKey] ??
          [];

        return scriptAllowedTypes.length === 0 || scriptAllowedTypes.includes('inline');
      })
    )
  );
};
