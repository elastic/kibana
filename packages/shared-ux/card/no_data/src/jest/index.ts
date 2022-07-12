/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-expect-error Pending updates to how Bazel can package storybook and jest mocks.
import { getRedirectAppLinksMockServices } from '@kbn/shared-ux-link-redirect-app/target_node/jest';
import { NoDataCardServices } from '../services';

const defaultParams = { canAccessFleet: true };

/**
 * Returns the Jest-compatible service abstractions for the `NoDataCard` Provider.
 */
export const getNoDataCardMockServices = (params: Partial<NoDataCardServices> = defaultParams) => {
  let { canAccessFleet } = params;
  if (canAccessFleet === undefined) {
    canAccessFleet = defaultParams.canAccessFleet;
  }

  const services: NoDataCardServices = {
    ...getRedirectAppLinksMockServices(),
    canAccessFleet,
    addBasePath: (path) => path,
  };

  return services;
};
