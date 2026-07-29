/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AuthzDisabled } from '@kbn/core-security-server';
import {
  DISCOVER_SESSION_API_BASE_PATH,
  DISCOVER_SESSION_API_VERSION,
} from '../../common/constants';

export const getRouteConfig = () => {
  return {
    basePath: DISCOVER_SESSION_API_BASE_PATH,
    routeConfig: {
      access: 'internal',
      enableQueryVersion: true,
      security: {
        authz: AuthzDisabled.delegateToSOClient,
      },
    } as const,
    routeVersion: DISCOVER_SESSION_API_VERSION,
  };
};
