/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { AnalyticsNoDataPageStorybookMock } from '@kbn/shared-ux-page-analytics-no-data-mocks';
import type { AnalyticsNoDataPageStorybookParams } from '@kbn/shared-ux-page-analytics-no-data-mocks';

import { AnalyticsNoDataPage as Component } from './analytics_no_data_page';
import { AnalyticsNoDataPageProvider } from './services';
import mdx from '../README.mdx';

const mock = new AnalyticsNoDataPageStorybookMock();

export default {
  title: 'No Data/Page/Kibana',
  description: 'An Analytics-specific version of KibanaNoDataPage.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const Analytics = (params: AnalyticsNoDataPageStorybookParams) => {
  return (
    <AnalyticsNoDataPageProvider {...mock.getProps(params)} {...mock.getServices(params)}>
      <Component {...mock.getProps(params)} />
    </AnalyticsNoDataPageProvider>
  );
};

Analytics.argTypes = mock.getArgumentTypes();
