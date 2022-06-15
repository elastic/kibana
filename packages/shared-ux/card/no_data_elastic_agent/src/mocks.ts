/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import {
  getRedirectAppLinksMockServices,
  getRedirectAppLinksStoryArgTypes,
  getRedirectAppLinksStoryServices,
} from '@kbn/shared-ux-link-redirect-app';

import { NoDataElasticAgentCardServices } from './services';

/**
 * Parameters drawn from the Storybook arguments collection that customize a component story.
 */
export type Params = Record<keyof ReturnType<typeof getStoryArgTypes>, any>;

/**
 * Returns Storybook-compatible service abstractions for the `NoDataElasticAgentCard` Provider.
 */
export const getStoryServices = (params: Params) => {
  const services: NoDataElasticAgentCardServices = {
    ...getRedirectAppLinksStoryServices(),
    ...params,
    addBasePath: (path) => {
      action('addBasePath')(path);
      return path;
    },
  };

  return services;
};

/**
 * Returns the Storybook arguments for `NoDataElasticAgentCard`, for its stories and for
 * consuming component stories.
 */
export const getStoryArgTypes = () => ({
  ...getRedirectAppLinksStoryArgTypes(),
  canAccessFleet: {
    control: 'boolean',
    defaultValue: true,
  },
  description: {
    control: {
      type: 'text',
    },
    defaultValue: '',
  },
  category: {
    control: {
      type: 'text',
    },
    defaultValue: '',
  },
});

/**
 * Returns the Jest-compatible service abstractions for the `NoDataElasticAgentCard` Provider.
 */
export const getMockServices = (params?: Params) => {
  const { canAccessFleet } = params || { canAccessFleet: true };

  const services: NoDataElasticAgentCardServices = {
    ...getRedirectAppLinksMockServices(),
    canAccessFleet,
    addBasePath: (path) => path,
  };

  return services;
};
