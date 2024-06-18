/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createLogsContextService, LogsContextService } from '@kbn/discover-utils';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfileProviderDeps {
  // We will probably soon add uiSettings as a dependency
  // to consume user configured indices
}

export interface ProfileProviderServices {
  logsContextService: LogsContextService;
}

export const createProfileProviderServices = (
  _deps: ProfileProviderDeps = {}
): ProfileProviderServices => {
  return {
    logsContextService: createLogsContextService(),
  };
};
