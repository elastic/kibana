/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { KibanaNoDataPageStorybookMock } from '@kbn/shared-ux-page-kibana-no-data-mocks';
import type { KibanaNoDataPageStorybookParams } from '@kbn/shared-ux-page-kibana-no-data-mocks';

import { KibanaNoDataPage as Component } from './kibana_no_data_page';

import { KibanaNoDataPageProvider } from './services';
import mdx from '../README.mdx';

export default {
  title: 'No Data/Page/Kibana',
  description: 'A component to display when there is no data available',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const mock = new KibanaNoDataPageStorybookMock();

export const Kibana = (params: KibanaNoDataPageStorybookParams) => {
  return (
    <KibanaNoDataPageProvider {...mock.getServices(params)}>
      <Component {...mock.getProps(params)} />
    </KibanaNoDataPageProvider>
  );
};

Kibana.argTypes = mock.getArgumentTypes();

export const LoadingState = (params: KibanaNoDataPageStorybookParams) => {
  // Simulate loading with a Promise that doesn't resolve.
  const dataCheck = () => new Promise<boolean>((resolve, reject) => {});

  const services = {
    ...mock.getServices(params),
    hasESData: dataCheck,
    hasUserDataView: dataCheck,
    hasDataView: dataCheck,
  };

  return (
    <KibanaNoDataPageProvider {...services}>
      <Component {...mock.getProps(params)} />
    </KibanaNoDataPageProvider>
  );
};
