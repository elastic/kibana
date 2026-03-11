/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepmerge from 'deepmerge';
import { isPlainObject } from 'lodash';

import type {
  NoDataPageServices,
  NoDataPageKibanaDependencies,
} from '@kbn/shared-ux-page-no-data-types';

import {
  getNoDataCardServicesMock,
  getNoDataCardKibanaDependenciesMock,
} from '@kbn/shared-ux-card-no-data-mocks';

const defaultParams = {
  canAccessFleet: true,
};

export function getServicesMock(
  params: Partial<NoDataPageServices> = defaultParams
): NoDataPageServices {
  const canAccessFleet =
    params.canAccessFleet !== undefined ? params.canAccessFleet : defaultParams.canAccessFleet;

  const services: NoDataPageServices = {
    ...getNoDataCardServicesMock(),
    canAccessFleet,
  };

  return services;
}

/**
 * Return a Jest mock of the Kibana dependencies for the `NoDataPageKibanaProvider`.
 */
export function getKibanaDependenciesMock(
  params: Partial<NoDataPageServices> = defaultParams
): NoDataPageKibanaDependencies {
  const integrations =
    params.canAccessFleet !== undefined ? params.canAccessFleet : defaultParams.canAccessFleet;

  const result: NoDataPageKibanaDependencies = deepmerge(
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
      },
    },
    getNoDataCardKibanaDependenciesMock(),
    {
      isMergeableObject: isPlainObject,
    }
  );

  return result;
}
