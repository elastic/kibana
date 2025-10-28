/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createLogsContextService,
  type LogsContextService,
  createMetricsContextService,
  type MetricsContextService,
  type ApmContextService,
  createApmContextService,
} from '@kbn/discover-utils';

import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import type { ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';
import type { MetricsExperiencePluginStart } from '@kbn/metrics-experience-plugin/public';
import type { DiscoverServices } from '../../build_services';

/**
 * Dependencies required by profile provider implementations
 */
export interface ProfileProviderSharedServicesDeps {
  logsDataAccess?: LogsDataAccessPluginStart;
  apmSourcesAccess?: ApmSourceAccessPluginStart;
  metricsExperience?: MetricsExperiencePluginStart;
}

/**
 * Shared services provided to profile provider implementations
 */
export interface ProfileProviderSharedServices {
  logsContextService: LogsContextService;
  apmContextService: ApmContextService;
  metricsContextService: MetricsContextService;
}

/**
 * Services provided to profile provider implementations
 */
export type ProfileProviderServices = ProfileProviderSharedServices & DiscoverServices;

/**
 * Creates the profile provider services
 * @param _deps Profile provider dependencies
 * @returns Profile provider services
 */
export const createProfileProviderSharedServices = async ({
  logsDataAccess,
  apmSourcesAccess,
  metricsExperience,
}: ProfileProviderSharedServicesDeps): Promise<ProfileProviderSharedServices> => {
  const [logsContextService, apmContextService, metricsContextService] = await Promise.all([
    createLogsContextService({ logsDataAccess }),
    createApmContextService({ apmSourcesAccess }),
    createMetricsContextService({ metricsExperience }),
  ]);

  return { logsContextService, apmContextService, metricsContextService };
};
