/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getNoDataCardKibanaDependenciesMock } from '@kbn/shared-ux-card-no-data-mocks';
import type {
  KibanaPageTemplateServices,
  KibanaPageTemplateKibanaDependencies,
} from '@kbn/shared-ux-page-kibana-template-types';
import { getNoDataConfigPageServicesMock } from '@kbn/shared-ux-page-no-data-config-mocks';

export const getServicesMock = () => {
  const services: KibanaPageTemplateServices = {
    ...getNoDataConfigPageServicesMock(),
  };

  return services;
};

export const getKibanaDependenciesMock = () => {
  const dependencies: KibanaPageTemplateKibanaDependencies = {
    ...getNoDataCardKibanaDependenciesMock(),
  };

  return dependencies;
};
