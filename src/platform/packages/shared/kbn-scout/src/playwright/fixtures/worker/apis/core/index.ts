/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { KbnClient, ScoutLogger, measurePerformanceAsync } from '../../../../../common';

export interface CoreApiService {
  /** * When running in test environments, the Config overrides can be updated without restarting Kibana
   * @param configOverrides - The configuration overrides to apply.
   * @example
   * ```ts
   * await coreApi.settings({
   *   'feature_flags.overrides': {
   *     'my-feature-flag': 'my-forced-value',
   *   }
   * });
   * ```
   */
  settings: (configOverrides: Record<string, any>) => Promise<void>;
}

export const getCoreApiHelper = (log: ScoutLogger, kbnClient: KbnClient): CoreApiService => {
  return {
    settings: async (configOverrides: Record<string, any>) => {
      await measurePerformanceAsync(
        log,
        `coreApi.settings [${JSON.stringify(configOverrides)}]`,
        async () => {
          await kbnClient.request({
            path: '/internal/core/_settings',
            method: 'PUT',
            headers: {
              [ELASTIC_HTTP_VERSION_HEADER]: '1',
              [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'scout',
            },
            body: configOverrides,
          });
        }
      );
    },
  };
};
