/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createLogsContextService, LogsContextService } from '@kbn/discover-utils';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import type { DiscoverServices } from '../../build_services';

/**
 * Dependencies required by profile provider implementations
 */
export interface ProfileProviderDeps extends DiscoverServices {
  logsDataAccessPlugin?: LogsDataAccessPluginStart;
}

/**
 * Services provided to profile provider implementations
 */
export interface ProfileProviderServices extends DiscoverServices {
  /**
   * A service containing methods used for logs profiles
   */
  logsContextService: LogsContextService;
}

/**
 * Creates the profile provider services
 * @param _deps Profile provider dependencies
 * @returns Profile provider services
 */
export const createProfileProviderServices = async (
  deps: ProfileProviderDeps = {}
): Promise<ProfileProviderServices> => {
  return {
    ...discoverServices,
    logsContextService: await createLogsContextService({
      logsDataAccessPlugin: deps.logsDataAccessPlugin,
    }),
  };
};
