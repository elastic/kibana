/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  NoDataConfigPageServices,
  NoDataConfigPageKibanaDependencies,
} from '@kbn/shared-ux-page-no-data-config-types';

import {
  getNoDataPageServicesMock,
  getNoDataPageKibanaDependenciesMock,
} from '@kbn/shared-ux-page-no-data-mocks';

export const getServicesMock = () => {
  const services: NoDataConfigPageServices = {
    ...getNoDataPageServicesMock(),
  };

  return services;
};

export const getKibanaDependenciesMock = () => {
  const dependencies: NoDataConfigPageKibanaDependencies = {
    ...getNoDataPageKibanaDependenciesMock(),
  };

  return dependencies;
};
