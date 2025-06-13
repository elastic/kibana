/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CreateGetDefaultAppStateParams } from '../accessors';
import type { LogsDataSourceProfileProvider } from '../profile';
import { CLIENT_IP_COLUMN, HOST_NAME_COLUMN, LOG_LEVEL_COLUMN, MESSAGE_COLUMN } from '../consts';
import { extendProfileProvider } from '../../../extend_profile_provider';
import { createGetDefaultAppState } from '../accessors';
import { createResolve } from './create_resolve';

type CuratedLogsProfileProvider = Pick<LogsDataSourceProfileProvider, 'profileId'> & {
  baseIndexPattern: string;
  defaultState: CreateGetDefaultAppStateParams;
};

const curatedLogsProfileProviders: CuratedLogsProfileProvider[] = [
  {
    profileId: 'observability-apache-error-logs-data-source-profile',
    baseIndexPattern: 'logs-apache.error',
    defaultState: {
      defaultColumns: [LOG_LEVEL_COLUMN, CLIENT_IP_COLUMN, MESSAGE_COLUMN],
    },
  },
  {
    profileId: 'observability-aws-s3access-logs-data-source-profile',
    baseIndexPattern: 'logs-aws.s3access',
    defaultState: {
      defaultColumns: [
        { name: 'aws.s3.bucket.name', width: 200 },
        { name: 'aws.s3.object.key', width: 200 },
        { name: 'aws.s3access.operation', width: 200 },
        CLIENT_IP_COLUMN,
        MESSAGE_COLUMN,
      ],
    },
  },
  {
    profileId: 'observability-kubernetes-container-logs-data-source-profile',
    baseIndexPattern: 'logs-kubernetes.container_logs',
    defaultState: {
      defaultColumns: [
        LOG_LEVEL_COLUMN,
        { name: 'kubernetes.pod.name', width: 200 },
        { name: 'kubernetes.namespace', width: 200 },
        { name: 'orchestrator.cluster.name', width: 200 },
        MESSAGE_COLUMN,
      ],
    },
  },
  {
    profileId: 'observability-nginx-access-logs-data-source-profile',
    baseIndexPattern: 'logs-nginx.access',
    defaultState: {
      defaultColumns: [
        { name: 'url.path', width: 150 },
        { name: 'http.response.status_code', width: 200 },
        CLIENT_IP_COLUMN,
        HOST_NAME_COLUMN,
        MESSAGE_COLUMN,
      ],
    },
  },
  {
    profileId: 'observability-nginx-error-logs-data-source-profile',
    baseIndexPattern: 'logs-nginx.error',
    defaultState: {
      defaultColumns: [LOG_LEVEL_COLUMN, MESSAGE_COLUMN],
    },
  },
  {
    profileId: 'observability-system-logs-data-source-profile',
    baseIndexPattern: 'logs-system',
    defaultState: {
      defaultColumns: [
        LOG_LEVEL_COLUMN,
        { name: 'process.name', width: 150 },
        HOST_NAME_COLUMN,
        MESSAGE_COLUMN,
      ],
    },
  },
  {
    profileId: 'observability-windows-logs-data-source-profile',
    baseIndexPattern: 'logs-windows',
    defaultState: {
      defaultColumns: [LOG_LEVEL_COLUMN, HOST_NAME_COLUMN, MESSAGE_COLUMN],
    },
  },
];

export const createCuratedLogsDataSourceProfileProviders = (
  logsDataSourceProfileProvider: LogsDataSourceProfileProvider
) =>
  curatedLogsProfileProviders.map(({ profileId, defaultState, baseIndexPattern }) =>
    extendProfileProvider(logsDataSourceProfileProvider, {
      profileId,
      profile: {
        getDefaultAppState: createGetDefaultAppState(defaultState),
      },
      resolve: createResolve(baseIndexPattern),
    })
  );
