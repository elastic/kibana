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
import { INTERNAL_API_VERSION } from '../../../../common/lib/api_constants';

export interface WorkflowServiceAccount {
  id: string;
  name: string;
  description?: string;
  roles: string[];
  enabled: boolean;
  assumable: boolean;
}

/** What a user who cannot manage service accounts may see of the account a workload runs as. */
export type WorkflowServiceAccountSummary = Pick<
  WorkflowServiceAccount,
  'id' | 'name' | 'enabled' | 'assumable'
>;

/** A workflow, or one of its executions, whose service account the user can read. */
export type ServiceAccountWorkload = { workflowId: string } | { executionId: string };

export interface ServiceAccountPage {
  serviceAccounts: WorkflowServiceAccount[];
  nextPage?: string;
}

export interface ServiceAccountDirectoryError {
  error: Exclude<ServiceAccountPickerStatus, 'loading' | 'ready'>;
}

/** Reads any account from the directory. Only for users who can manage service accounts. */
export const serviceAccountQueryOptions = (http: HttpStart, id: string) => ({
  queryKey: ['workflows', 'serviceAccounts', 'account', id],
  queryFn: async (): Promise<WorkflowServiceAccount | null> => {
    try {
      return await http.get<WorkflowServiceAccount>(
        `/internal/security/service_account/${encodeURIComponent(id)}`
      );
    } catch {
      return null;
    }
  },
  retry: false,
  staleTime: 30_000,
  cacheTime: 60_000,
});

const getWorkloadPath = (workload: ServiceAccountWorkload): string =>
  'workflowId' in workload
    ? `/internal/workflows/workflow/${encodeURIComponent(workload.workflowId)}/service_account`
    : `/internal/workflows/executions/${encodeURIComponent(workload.executionId)}/service_account`;

/**
 * Reads the account a workflow is bound to, or an execution ran as. Any user who can read the
 * workload can make this read, so it is how names reach users without `manage_security`.
 */
export const workloadServiceAccountQueryOptions = (
  http: HttpStart,
  workload: ServiceAccountWorkload
) => ({
  queryKey: ['workflows', 'serviceAccounts', 'workload', workload],
  queryFn: async (): Promise<WorkflowServiceAccountSummary | null> => {
    try {
      const { serviceAccount } = await http.get<{
        serviceAccount: WorkflowServiceAccountSummary | null;
      }>(getWorkloadPath(workload), { version: INTERNAL_API_VERSION });
      return serviceAccount;
    } catch {
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
  isEnabled: () => boolean,
  canManage: () => boolean
) => ({
  isEnabled,
  canManage,
  /**
   * Reads any account by id, for users who can manage service accounts. Everyone else gets `null`
   * without a request, since Elasticsearch would refuse it and Kibana would log the refusal.
   */
  get: (id: string): Promise<WorkflowServiceAccount | null> =>
    isEnabled() && canManage() && id
      ? queryClient.fetchQuery(serviceAccountQueryOptions(http, id))
      : Promise.resolve(null),
  /**
   * Names the account `id` for display. A user who cannot manage service accounts only sees the
   * name when `id` is the account the saved workflow is bound to.
   */
  describe: async (
    id: string,
    workflowId?: string
  ): Promise<WorkflowServiceAccountSummary | null> => {
    if (!isEnabled() || !id) return null;
    if (canManage()) return queryClient.fetchQuery(serviceAccountQueryOptions(http, id));
    if (!workflowId) return null;
    const bound = await queryClient.fetchQuery(
      workloadServiceAccountQueryOptions(http, { workflowId })
    );
    return bound?.id === id ? bound : null;
  },
  list: async (
    after?: string,
    refresh = false
  ): Promise<ServiceAccountPage | ServiceAccountDirectoryError | null> => {
    if (!isEnabled()) return null;
    try {
      // Failures are thrown rather than returned so that the query cache never stores them.
      return await queryClient.fetchQuery({
        queryKey: ['workflows', 'serviceAccounts', 'page', after],
        queryFn: () =>
          http.get<ServiceAccountPage>('/internal/security/service_account', {
            query: { limit: 100, ...(after ? { after } : {}) },
          }),
        retry: false,
        staleTime: refresh ? 0 : 30_000,
        cacheTime: 60_000,
      });
    } catch (error) {
      return {
        error:
          isHttpFetchError(error) && error.response?.status === 403 ? 'forbidden' : 'unavailable',
      };
    }
  },
});

export type ServiceAccountDirectory = ReturnType<typeof createServiceAccountDirectory>;
