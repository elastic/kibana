/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getKibanaNoDataPageStoryArgTypes,
  getKibanaNoDataPageStoryMock,
  getKibanaNoDataPageMockServices,
} from '@kbn/shared-ux-page-kibana-no-data';

import { AnalyticsNoDataPageServices } from './services';

export type Params = Record<keyof ReturnType<typeof getStoryArgTypes>, any>;

export const getStoryServices = (params: Params) => {
  const services: AnalyticsNoDataPageServices = {
    ...getKibanaNoDataPageStoryMock({ ...params, solution: 'Analytics', logo: 'logoKibana' }),
    kibanaGuideDocLink: 'Kibana guide',
  };

  return services;
};

export const getStoryArgTypes = () => {
  // While `solution` and `logo` are props on `KibanaNoDataPage`, they are set by
  // `AnalyticsNoDataPage` internally. So calls to `getStoryArgTypes` for `AnalyticsNoDataPage`
  // need to remove them for any of its stories, (as they'll have no effect).
  const { solution, logo, ...args } = getKibanaNoDataPageStoryArgTypes();
  return {
    kibanaGuideDocLink: {
      control: 'text',
      defaultValue: 'Kibana guide',
    },
    ...args,
  };
};

export const getMockServices = () => {
  const services: AnalyticsNoDataPageServices = {
    ...getKibanaNoDataPageMockServices(),
    kibanaGuideDocLink: 'Kibana guide',
  };

  return services;
};
