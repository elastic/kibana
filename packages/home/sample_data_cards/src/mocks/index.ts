/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';

import previewImagePath from './dashboard.png';
import darkPreviewImagePath from './dashboard_dark.png';
import iconPath from './icon.svg';

import { Services } from '../services';
import { SampleDataSet } from '../types';

export const ecommerceImages = { previewImagePath, darkPreviewImagePath, iconPath };

export const mockDataSet: SampleDataSet = {
  darkPreviewImagePath,
  defaultIndex: 'default-index',
  iconPath,
  id: 'sample-data-set',
  overviewDashboard: 'overview-dashboard',
  previewImagePath,
  appLinks: [
    {
      icon: 'visLine',
      label: 'View in App',
      path: 'path-to-app',
    },
  ],
  name: 'Sample Data Set',
  description: 'This is a sample data set you can use.',
  status: 'not_installed',
};

export const getMockDataSet = (params: Partial<SampleDataSet> = {}) => ({
  ...mockDataSet,
  ...params,
});

/**
 * Parameters drawn from the Storybook arguments collection that customize a component story.
 */
export type Params = Record<keyof ReturnType<typeof getStoryArgTypes>, any>;

/**
 * Returns Storybook-compatible service abstractions for the `SampleDataCards` Provider.
 */
export const getStoryServices = (params: Params) => {
  const { simulateErrors } = params;
  const services: Services = {
    ...params,
    addBasePath: (path) => {
      action('addBasePath')(path);
      return path;
    },
    fetchSampleDataSets: async () => {
      return [];
    },
    getAppNavigationHandler: (path) => () => action('getAppNavigationHandler')(path),
    installSampleDataSet: async (id, defaultIndex) => {
      if (simulateErrors) {
        throw new Error('Error on install');
      }
      action('installSampleDataSet')(id, defaultIndex);
    },
    notifyError: action('notifyError'),
    notifySuccess: action('notifySuccess'),
    uninstallSampleDataSet: async (id) => {
      if (simulateErrors) {
        throw new Error('Error on uninstall');
      }
      action('uninstallSampleDataSet')(id);
    },
  };

  return services;
};

/**
 * Returns the Storybook arguments for `SampleDataCards`, for its stories and for
 * consuming component stories.
 */
export const getStoryArgTypes = () => ({
  name: {
    control: {
      type: 'text',
    },
    defaultValue: mockDataSet.name,
  },
  description: {
    control: {
      type: 'text',
    },
    defaultValue: mockDataSet.description,
  },
  status: {
    options: ['not_installed', 'installed'],
    control: { type: 'radio' },
    defaultValue: mockDataSet.status,
  },
  includeAppLinks: {
    control: 'boolean',
    defaultValue: true,
  },
  simulateErrors: {
    control: 'boolean',
    defaultValue: false,
  },
});

/**
 * Returns the Jest-compatible service abstractions for the `NoDataCard` Provider.
 */
export const getMockServices = (params: Partial<Services> = {}) => {
  const services: Services = {
    addBasePath: (path) => path,
    fetchSampleDataSets: jest.fn(),
    getAppNavigationHandler: jest.fn(),
    installSampleDataSet: jest.fn(),
    notifyError: jest.fn(),
    notifySuccess: jest.fn(),
    uninstallSampleDataSet: jest.fn(),
    ...params,
  };

  return services;
};
