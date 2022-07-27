/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Services } from './services';

/**
 * Parameters drawn from the Storybook arguments collection that customize a component story.
 */
export type Params = Record<keyof ReturnType<typeof getStoryArgTypes>, any>;
type ActionFn = (name: string) => any;

/**
 * Returns the Jest-compatible service abstractions for the `NoDataCard` Provider.
 */
export const getMockServices = (overrides?: Partial<Services>) => {
  const services: Services = {
    canEditAdvancedSettings: true,
    getUrlForListingLimitSettings: () => 'http://elastic.co',
    notifyError: () => undefined,
    ...overrides,
  };

  return services;
};
/**
 * Returns Storybook-compatible service abstractions for the `NoDataCard` Provider.
 */
export const getStoryServices = (params: Params, action: ActionFn = () => {}) => {
  const services: Services = {
    canEditAdvancedSettings: true,
    getUrlForListingLimitSettings: () => 'http://elastic.co',
    notifyError: ({ title, text }) => {
      action('notifyError')({ title, text });
    },
    ...params,
  };

  return services;
};

/**
 * Returns the Storybook arguments for `NoDataCard`, for its stories and for
 * consuming component stories.
 */
export const getStoryArgTypes = () => ({});
