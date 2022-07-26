/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RedirectAppLinksStorybookMocks } from '@kbn/shared-ux-link-redirect-app-storybook';
import { getRedirectAppLinksMockServices } from '@kbn/shared-ux-link-redirect-app-jest';

import { NoDataCardServices } from './services';

/**
 * Parameters drawn from the Storybook arguments collection that customize a component story.
 */
export type Params = Record<keyof ReturnType<typeof getStoryArgTypes>, any>;
type ActionFn = (name: string) => any;

/**
 * Returns Storybook-compatible service abstractions for the `NoDataCard` Provider.
 */
export const getStoryServices = (params: Params, action: ActionFn = () => {}) => {
  const services: NoDataCardServices = {
    ...RedirectAppLinksStorybookMocks.getServices(),
    ...params,
    addBasePath: (path) => {
      action('addBasePath')(path);
      return path;
    },
  };

  return services;
};

/**
 * Returns the Storybook arguments for `NoDataCard`, for its stories and for
 * consuming component stories.
 */
export const getStoryArgTypes = () => ({
  canAccessFleet: {
    control: 'boolean',
    defaultValue: true,
  },
  category: {
    control: {
      type: 'text',
    },
    defaultValue: '',
  },
  title: {
    control: {
      type: 'text',
    },
    defaultValue: '',
  },
  description: {
    control: {
      type: 'text',
    },
    defaultValue: '',
  },
  button: {
    control: {
      type: 'text',
    },
    defaultValue: '',
  },
  ...RedirectAppLinksStorybookMocks.getServiceArgumentTypes(),
});

/**
 * Returns the Jest-compatible service abstractions for the `NoDataCard` Provider.
 */
export const getMockServices = (params?: Params) => {
  const { canAccessFleet } = params || { canAccessFleet: true };

  const services: NoDataCardServices = {
    ...getRedirectAppLinksMockServices(),
    canAccessFleet,
    addBasePath: (path) => path,
  };

  return services;
};
