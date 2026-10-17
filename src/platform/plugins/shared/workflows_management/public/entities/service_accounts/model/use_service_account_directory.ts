/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@kbn/react-query';
import type { ServiceAccountWorkload } from './service_account_directory';
import {
  createServiceAccountDirectory,
  workloadServiceAccountQueryOptions,
} from './service_account_directory';
import { useKibana } from '../../../hooks/use_kibana';

export const useServiceAccountDirectory = () => {
  const { http, security } = useKibana().services;
  const queryClient = useQueryClient();
  return useMemo(
    () =>
      createServiceAccountDirectory(
        http,
        queryClient,
        () => security.serviceAccounts.isEnabled(),
        () => security.serviceAccounts.canCreate()
      ),
    [http, queryClient, security]
  );
};

/**
 * The account `id` as the workload reports it, or `null` when the workload names no account or a
 * different one.
 */
export const useWorkloadServiceAccount = (id: string, workload?: ServiceAccountWorkload) => {
  const { http, security } = useKibana().services;
  const enabled = security.serviceAccounts.isEnabled() && !!id && !!workload;
  const result = useQuery({
    ...workloadServiceAccountQueryOptions(http, workload ?? { workflowId: '' }),
    enabled,
  });
  return enabled && result.data?.id === id ? result.data : null;
};
