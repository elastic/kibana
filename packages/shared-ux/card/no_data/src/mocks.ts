/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getRedirectAppLinksMockServices } from '@kbn/shared-ux-link-redirect-app';

import { NoDataCardServices } from './services';

/**
 * Returns the Jest-compatible service abstractions for the `NoDataCard` Provider.
 */
export const getMockServices = (params?: NoDataCardServices) => {
  const { canAccessFleet } = params || { canAccessFleet: true };

  const services: NoDataCardServices = {
    ...getRedirectAppLinksMockServices(),
    canAccessFleet,
    addBasePath: (path) => path,
  };

  return services;
};
