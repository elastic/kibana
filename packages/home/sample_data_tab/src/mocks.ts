/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getSampleDataCardStoryArgTypes,
  getSampleDataCardStoryServices,
  getSampleDataCardMockDataSet,
} from '@kbn/home-sample-data-card';

import { SampleDataTabServices } from './services';

/**
 * Parameters drawn from the Storybook arguments collection that customize a component story.
 */
export type Params = Record<keyof ReturnType<typeof getStoryArgTypes>, any>;

/**
 * Returns Storybook-compatible service abstractions for the `SampleDataCard` Provider.
 */
export const getStoryServices = (params: Params) => {
  const services: SampleDataTabServices = {
    fetchSampleDataSets: async () => {
      const data = getSampleDataCardMockDataSet(params);
      return [data, data, data];
    },
    logClick: () => {},
    ...getSampleDataCardStoryServices(params),
  };

  return services;
};

/**
 * Returns the Storybook arguments for `SampleDataCard`, for its stories and for
 * consuming component stories.
 */
export const getStoryArgTypes = () => ({
  ...getSampleDataCardStoryArgTypes(),
});
