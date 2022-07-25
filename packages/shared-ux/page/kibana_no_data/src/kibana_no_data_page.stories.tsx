/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';

import { KibanaNoDataPage as Component } from './kibana_no_data_page';
import { StoryParams, getStoryServices, getStoryArgTypes } from './mocks';

import { KibanaNoDataPageProvider } from './services';
import mdx from '../README.mdx';

export default {
  title: 'No Data/Kibana Page',
  description: 'A component to display when there is no data available',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const noDataConfig = {
  solution: 'Analytics',
  logo: 'logoKibana',
  action: {
    elasticAgent: {
      title: 'Add Integrations',
    },
  },
  docsLink: 'http://docs.elastic.dev',
};

export const KibanaNoDataPage = (params: StoryParams) => {
  const { solution, logo } = params;

  return (
    <KibanaNoDataPageProvider {...getStoryServices(params)}>
      <Component
        onDataViewCreated={action('onDataViewCreated')}
        noDataConfig={{ ...noDataConfig, solution, logo }}
      />
    </KibanaNoDataPageProvider>
  );
};

KibanaNoDataPage.argTypes = {
  ...getStoryArgTypes(),
};

export const LoadingState = (params: StoryParams) => {
  // Simulate loading with a Promise that doesn't resolve.
  const dataCheck = () => new Promise<boolean>((resolve, reject) => {});

  const services = {
    ...getStoryServices(params),
    hasESData: dataCheck,
    hasUserDataView: dataCheck,
    hasDataView: dataCheck,
  };

  return (
    <KibanaNoDataPageProvider {...services}>
      <Component onDataViewCreated={action('onDataViewCreated')} noDataConfig={noDataConfig} />
    </KibanaNoDataPageProvider>
  );
};
