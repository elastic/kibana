/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import type { QueryClient } from '@kbn/react-query';
import type { ServiceAccountPickerStatus } from '@kbn/security-plugin/public';

export interface WorkflowServiceAccount {
  id: string;
  name: string;
  description?: string;
  roles: string[];
  enabled: boolean;
  assumable: boolean;
}

export interface ServiceAccountPage {
  serviceAccounts: WorkflowServiceAccount[];
  nextPage?: string;
}

export interface ServiceAccountDirectoryError {
  error: Exclude<ServiceAccountPickerStatus, 'loading' | 'ready'>;
}

export const serviceAccountQueryOptions = (http: HttpStart, id: string) => ({
  queryKey: ['workflows', 'serviceAccounts', 'account', id],
  queryFn: async (): Promise<WorkflowServiceAccount | null> => {
    try {
      return await http.get<WorkflowServiceAccount>(
        `/internal/security/service_account/${encodeURIComponent(id)}`
      );
    } catch {
      // Directory access is optional: workflow executors need not have read_security.
      return null;
    }
  },
  retry: false,
  staleTime: 30_000,
  cacheTime: 60_000,
});

export const createServiceAccountDirectory = (
  http: HttpStart,
  queryClient: QueryClient,
  isEnabled: () => boolean
) => ({
  isEnabled,
  get: (id: string): Promise<WorkflowServiceAccount | null> =>
    isEnabled() && id
      ? queryClient.fetchQuery(serviceAccountQueryOptions(http, id))
      : Promise.resolve(null),
  list: (
    after?: string,
    refresh = false
  ): Promise<ServiceAccountPage | ServiceAccountDirectoryError | null> =>
    isEnabled()
      ? queryClient.fetchQuery({
          queryKey: ['workflows', 'serviceAccounts', 'page', after],
          queryFn: async (): Promise<ServiceAccountPage | ServiceAccountDirectoryError> => {
            try {
              return await http.get<ServiceAccountPage>('/internal/security/service_account', {
                query: { limit: 100, ...(after ? { after } : {}) },
              });
            } catch (error) {
              return {
                error:
                  isHttpFetchError(error) && error.response?.status === 403
                    ? 'forbidden'
                    : 'unavailable',
              };
            }
          },
          retry: false,
          staleTime: refresh ? 0 : 30_000,
          cacheTime: 60_000,
        })
      : Promise.resolve(null),
});

export type ServiceAccountDirectory = ReturnType<typeof createServiceAccountDirectory>;
