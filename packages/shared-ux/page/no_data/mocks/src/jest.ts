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

export const getServicesMock = (params: Partial<NoDataPageServices> = defaultParams) => {
  const canAccessFleet =
    params.canAccessFleet !== undefined ? params.canAccessFleet : defaultParams.canAccessFleet;

  const services: NoDataPageServices = {
    ...getNoDataCardServicesMock(),
    canAccessFleet,
  };

  return services;
};

/**
 * Return a Jest mock of the Kibana dependencies for the `NoDataPageKibanaProvider`.
 */
export const getKibanaDependenciesMock = (
  params: Partial<NoDataPageServices> = defaultParams
): NoDataPageKibanaDependencies => {
  const integrations =
    params.canAccessFleet !== undefined ? params.canAccessFleet : defaultParams.canAccessFleet;

  return deepmerge(
    {
      coreStart: {
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
};
