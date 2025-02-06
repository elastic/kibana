/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsNoDataPageServices } from '@kbn/shared-ux-page-analytics-no-data-types';
import { getKibanaNoDataPageServicesMock } from '@kbn/shared-ux-page-kibana-no-data-mocks';
import { of } from 'rxjs';

export const getServicesMock = () => {
  const services: AnalyticsNoDataPageServices = {
    ...getKibanaNoDataPageServicesMock(),
    kibanaGuideDocLink: 'Kibana guide',
    customBranding: { hasCustomBranding$: of(false) },
    prependBasePath: (path) => path,
    getHttp: <T>() => Promise.resolve({} as T),
    pageFlavor: 'kibana',
  };

  return services;
};

export const getServicesMockCustomBranding = () => {
  const services: AnalyticsNoDataPageServices = {
    ...getKibanaNoDataPageServicesMock(),
    // this mock will have custom branding set to true
    customBranding: { hasCustomBranding$: of(true) },
    kibanaGuideDocLink: 'Kibana guide',
    prependBasePath: (path) => path,
    getHttp: <T>() => Promise.resolve({} as T),
    pageFlavor: 'kibana',
  };

  return services;
};
