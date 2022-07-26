/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RedirectAppLinksServices } from '@kbn/shared-ux-link-redirect-app-types';

/**
 * Returns the Jest-compatible service abstractions for the `NoDataCard` Provider.
 */
export const getRedirectAppLinksMockServices = () => {
  const services: RedirectAppLinksServices = {
    navigateToUrl: jest.fn(),
    currentAppId: 'currentAppId',
  };

  return services;
};
