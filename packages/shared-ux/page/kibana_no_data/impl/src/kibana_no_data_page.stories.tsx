/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { KibanaNoDataPageStorybookMocks } from '@kbn/shared-ux-page-kibana-no-data-mocks';
import type { KibanaNoDataPageStorybookParams } from '@kbn/shared-ux-page-kibana-no-data-mocks';

import { KibanaNoDataPage as Component } from './kibana_no_data_page';

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

export const KibanaNoDataPage = (params: KibanaNoDataPageStorybookParams) => {
  const { solution, logo } = params;

  return (
    <KibanaNoDataPageProvider {...KibanaNoDataPageStorybookMocks.getServices(params)}>
      <Component
        onDataViewCreated={action('onDataViewCreated')}
        noDataConfig={{ ...noDataConfig, solution, logo }}
      />
    </KibanaNoDataPageProvider>
  );
};

KibanaNoDataPage.argTypes = KibanaNoDataPageStorybookMocks.getArgumentTypes();

export const LoadingState = (params: KibanaNoDataPageStorybookParams) => {
  // Simulate loading with a Promise that doesn't resolve.
  const dataCheck = () => new Promise<boolean>((resolve, reject) => {});

  const services = {
    ...KibanaNoDataPageStorybookMocks.getServices(params),
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
