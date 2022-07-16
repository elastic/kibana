/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NoDataCardServices } from '@kbn/shared-ux-card-no-data-types';
import { getRedirectAppLinksServicesMock } from '@kbn/shared-ux-link-redirect-app-mocks';

const defaultParams = { canAccessFleet: true };

/**
 * Returns the Jest-compatible service abstractions for the `NoDataCard` Provider.
 */
export const getServicesMock = (params: Partial<NoDataCardServices> = defaultParams) => {
  const canAccessFleet =
    params.canAccessFleet !== undefined ? params.canAccessFleet : defaultParams.canAccessFleet;

  const services: NoDataCardServices = {
    ...getRedirectAppLinksServicesMock(),
    canAccessFleet,
    addBasePath: (path) => path,
  };

  return services;
};
