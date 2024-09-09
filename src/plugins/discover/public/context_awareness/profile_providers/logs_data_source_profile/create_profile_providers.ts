/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProfileProviderServices } from '../profile_provider_services';
import { createLogsDataSourceProfileProvider } from './profile';
import {
  createApacheErrorLogsDataSourceProfileProvider,
  createAwsS3accessLogsDataSourceProfileProvider,
  createKubernetesContainerLogsDataSourceProfileProvider,
  createNginxAccessLogsDataSourceProfileProvider,
  createNginxErrorLogsDataSourceProfileProvider,
  createSystemLogsDataSourceProfileProvider,
  createWindowsLogsDataSourceProfileProvider,
} from './sub_profiles';

export const createLogsDataSourceProfileProviders = (providerServices: ProfileProviderServices) => {
  const logsDataSourceProfileProvider = createLogsDataSourceProfileProvider(providerServices);

  return [
    createSystemLogsDataSourceProfileProvider(logsDataSourceProfileProvider),
    createKubernetesContainerLogsDataSourceProfileProvider(logsDataSourceProfileProvider),
    createWindowsLogsDataSourceProfileProvider(logsDataSourceProfileProvider),
    createAwsS3accessLogsDataSourceProfileProvider(logsDataSourceProfileProvider),
    createNginxErrorLogsDataSourceProfileProvider(logsDataSourceProfileProvider),
    createNginxAccessLogsDataSourceProfileProvider(logsDataSourceProfileProvider),
    createApacheErrorLogsDataSourceProfileProvider(logsDataSourceProfileProvider),
    logsDataSourceProfileProvider,
  ];
};
