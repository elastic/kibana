/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createLogsContextService, LogsContextService } from '@kbn/discover-utils';

/**
 * Dependencies required by profile provider implementations
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfileProviderDeps {
  // We will probably soon add uiSettings as a dependency
  // to consume user configured indices
}

/**
 * Services provided to profile provider implementations
 */
export interface ProfileProviderServices {
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
export const createProfileProviderServices = (
  _deps: ProfileProviderDeps = {}
): ProfileProviderServices => {
  return {
    logsContextService: createLogsContextService(),
  };
};
