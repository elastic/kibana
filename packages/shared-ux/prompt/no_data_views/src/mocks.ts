/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';

import { NoDataViewsPromptServices } from './services';

export type Params = Record<keyof ReturnType<typeof getStoryArgTypes>, any>;

export const getStoryServices = (params: Params) => {
  const services: NoDataViewsPromptServices = {
    ...params,
    openDataViewEditor: (options) => {
      action('openDataViewEditor')(options);
      return () => {};
    },
  };

  return services;
};

export const getStoryArgTypes = () => ({
  canCreateNewDataView: {
    control: 'boolean',
    defaultValue: true,
  },
  dataViewsDocLink: {
    options: ['some/link', undefined],
    control: { type: 'radio' },
  },
});

export const getMockServices = (params?: Params) => {
  const { canCreateNewDataView, dataViewsDocLink } = params || {};

  const services: NoDataViewsPromptServices = {
    canCreateNewDataView: canCreateNewDataView || true,
    dataViewsDocLink: dataViewsDocLink || 'some/link',
    openDataViewEditor: jest.fn(),
  };

  return services;
};
