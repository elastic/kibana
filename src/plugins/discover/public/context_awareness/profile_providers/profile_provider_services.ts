/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createLogsContextService, LogsContextService } from '@kbn/discover-utils';
import { DiscoverServices } from '../../build_services';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfileProviderDeps extends DiscoverServices {
  // We will probably soon add uiSettings as a dependency
  // to consume user configured indices
}

export interface ProfileProviderServices extends DiscoverServices {
  logsContextService: LogsContextService;
}

export const createProfileProviderServices = (
  discoverServices: ProfileProviderDeps
): ProfileProviderServices => {
  return {
    ...discoverServices,
    logsContextService: createLogsContextService(),
  };
};
