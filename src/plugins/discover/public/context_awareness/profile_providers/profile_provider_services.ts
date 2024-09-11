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

export interface ProfileProviderDeps {
  logsDataAccessPlugin?: LogsDataAccessPluginStart;
}

export interface ProfileProviderServices {
  logsContextService: LogsContextService;
}

export const createProfileProviderServices = async (
  _deps: ProfileProviderDeps
): Promise<ProfileProviderServices> => {
  return {
    logsContextService: await createLogsContextService({
      logsDataAccessPlugin: _deps.logsDataAccessPlugin,
    }),
  };
};
