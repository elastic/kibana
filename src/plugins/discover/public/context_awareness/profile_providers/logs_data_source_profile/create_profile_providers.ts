/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ProfileProviderServices } from '../profile_provider_services';
import { createLogsDataSourceProfileProvider } from './profile';
import { createApacheErrorLogsDataSourceProfileProvider } from './sub_profiles/apache_error_logs';
import { createAwsS3LogsDataSourceProfileProvider } from './sub_profiles/aws_s3_logs';
import { createK8ContainerLogsDataSourceProfileProvider } from './sub_profiles/k8_container_logs';
import { createNginxAccessLogsDataSourceProfileProvider } from './sub_profiles/nginx_access_logs';
import { createNginxErrorLogsDataSourceProfileProvider } from './sub_profiles/nginx_error_logs';
import { createSystemLogsDataSourceProfileProvider } from './sub_profiles/system_logs';
import { createWindowsLogsDataSourceProfileProvider } from './sub_profiles/windows_logs';

export const createLogsDataSourceProfileProviders = (providerServices: ProfileProviderServices) => {
  const logsDataSourceProfileProvider = createLogsDataSourceProfileProvider(providerServices);

  return [
    createSystemLogsDataSourceProfileProvider(logsDataSourceProfileProvider),
    createK8ContainerLogsDataSourceProfileProvider(logsDataSourceProfileProvider),
    createWindowsLogsDataSourceProfileProvider(logsDataSourceProfileProvider),
    createAwsS3LogsDataSourceProfileProvider(logsDataSourceProfileProvider),
    createNginxErrorLogsDataSourceProfileProvider(logsDataSourceProfileProvider),
    createNginxAccessLogsDataSourceProfileProvider(logsDataSourceProfileProvider),
    createApacheErrorLogsDataSourceProfileProvider(logsDataSourceProfileProvider),
    logsDataSourceProfileProvider,
  ];
};
