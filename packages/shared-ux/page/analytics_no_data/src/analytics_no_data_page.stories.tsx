/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';

import { AnalyticsNoDataPage as Component } from './analytics_no_data_page';
import { AnalyticsNoDataPageProvider } from './services';
import mdx from '../README.mdx';

import { Params, getStoryArgTypes, getStoryServices } from './mocks';

export default {
  title: 'No Data/Analytics Page',
  description: 'An Analytics-specific version of KibanaNoDataPage.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const AnalyticsNoDataPage = (params: Params) => {
  return (
    <AnalyticsNoDataPageProvider {...getStoryServices(params)}>
      <Component onDataViewCreated={action('onDataViewCreated')} />
    </AnalyticsNoDataPageProvider>
  );
};

AnalyticsNoDataPage.argTypes = {
  ...getStoryArgTypes(),
};

export const LoadingState = (params: Params) => {
  // Simulate loading with a Promise that doesn't resolve.
  const dataCheck = () => new Promise<boolean>((_reject, _resolve) => {});

  const services = {
    ...getStoryServices(params),
    hasESData: dataCheck,
    hasUserDataView: dataCheck,
    hasDataView: dataCheck,
  };

  return (
    <AnalyticsNoDataPageProvider {...services}>
      <Component onDataViewCreated={action('onDataViewCreated')} />
    </AnalyticsNoDataPageProvider>
  );
};
