/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepmerge from 'deepmerge';
import { isPlainObject } from 'lodash';

import type {
  NoDataCardServices,
  NoDataCardKibanaDependencies,
} from '@kbn/shared-ux-card-no-data-types';

import {
  getRedirectAppLinksServicesMock,
  getRedirectAppLinksKibanaDependenciesMock,
} from '@kbn/shared-ux-link-redirect-app-mocks';

const defaultParams = { canAccessFleet: true };

/**
 * Returns the Jest-compatible service abstractions for the `NoDataCardProvider`.
 */
export const getServicesMock = (params: Partial<NoDataCardServices> = defaultParams) => {
  const canAccessFleet =
    params.canAccessFleet !== undefined ? params.canAccessFleet : defaultParams.canAccessFleet;
  const hasCustomBranding = params.hasCustomBranding ?? false;

  const services: NoDataCardServices = {
    ...getRedirectAppLinksServicesMock(),
    canAccessFleet,
    addBasePath: (path) => path,
    hasCustomBranding,
  };

  return services;
};

/**
 * Return a Jest mock of the Kibana dependencies for the `NoDataCardKibanaProvider`.
 */
export const getKibanaDependenciesMock = (
  params: Partial<NoDataCardServices> = defaultParams
): NoDataCardKibanaDependencies => {
  const integrations =
    params.canAccessFleet !== undefined ? params.canAccessFleet : defaultParams.canAccessFleet;

  const hasCustomBranding = params.hasCustomBranding ?? false;

  const result = deepmerge(
    {
      coreStart: {
        http: {
          basePath: {
            prepend: jest.fn(),
          },
        },
        application: {
          capabilities: {
            navLinks: {
              integrations,
            },
          },
        },
        customBranding: {
          hasCustomBranding,
        },
      },
    },
    getRedirectAppLinksKibanaDependenciesMock(),
    {
      isMergeableObject: isPlainObject,
    }
  );

  return result;
};
