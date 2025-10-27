/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KUBERNETES_CONTAINER_LOGS_PROFILE } from '@kbn/discover-utils';
import type { LogsDataSourceProfileProvider } from '../profile';
import { extendProfileProvider } from '../../../extend_profile_provider';
import { createGetDefaultAppState, createRecommendedFields } from '../accessors';
import { LOG_LEVEL_COLUMN, MESSAGE_COLUMN } from '../consts';
import { createResolve } from './create_resolve';

export const createKubernetesContainerLogsDataSourceProfileProvider = (
  logsDataSourceProfileProvider: LogsDataSourceProfileProvider
): LogsDataSourceProfileProvider =>
  extendProfileProvider(logsDataSourceProfileProvider, {
    profileId: 'observability-kubernetes-container-logs-data-source-profile',
    profile: {
      getDefaultAppState: createGetDefaultAppState({
        defaultColumns: [
          LOG_LEVEL_COLUMN,
          { name: 'kubernetes.pod.name', width: 200 },
          { name: 'kubernetes.namespace', width: 200 },
          { name: 'orchestrator.cluster.name', width: 200 },
          MESSAGE_COLUMN,
        ],
      }),
      getRecommendedFields: createRecommendedFields({
        defaultFields: KUBERNETES_CONTAINER_LOGS_PROFILE.recommendedFields,
      }),
    },
    resolve: createResolve(KUBERNETES_CONTAINER_LOGS_PROFILE.pattern),
  });
