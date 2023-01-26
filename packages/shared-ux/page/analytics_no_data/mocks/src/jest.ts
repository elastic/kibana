/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsNoDataPageServices } from '@kbn/shared-ux-page-analytics-no-data-types';
import { getKibanaNoDataPageServicesMock } from '@kbn/shared-ux-page-kibana-no-data-mocks';
import { of } from 'rxjs';

export const getServicesMock = () => {
  const services: AnalyticsNoDataPageServices = {
    ...getKibanaNoDataPageServicesMock(),
    customBranding: { hasCustomBranding$: of(false), showPlainSpinner: false },
    kibanaGuideDocLink: 'Kibana guide',
  };

  return services;
};

export const getServicesMockCustomBranding = () => {
  const services: AnalyticsNoDataPageServices = {
    ...getKibanaNoDataPageServicesMock(),
    // not specifying showPlainSpinner as true for testing the component
    customBranding: { hasCustomBranding$: of(true) },
    kibanaGuideDocLink: 'Kibana guide',
  };

  return services;
};
