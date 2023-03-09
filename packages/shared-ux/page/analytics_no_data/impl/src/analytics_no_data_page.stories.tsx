/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { AnalyticsNoDataPageStorybookMock } from '@kbn/shared-ux-page-analytics-no-data-mocks';
import type { AnalyticsNoDataPageStorybookParams } from '@kbn/shared-ux-page-analytics-no-data-mocks';
import { getMetaElementParameters } from '@kbn/shared-ux-storybook-docs';

import { AnalyticsNoDataPage as Component } from './analytics_no_data_page';
import { AnalyticsNoDataPageProvider } from './services';
import content, { attributes } from '../README.mdx';

const mock = new AnalyticsNoDataPageStorybookMock();

export default {
  title: 'No Data/Page/Kibana',
  description: 'An Analytics-specific version of KibanaNoDataPage.',
  parameters: getMetaElementParameters(attributes, content),
};

export const Analytics = (params: AnalyticsNoDataPageStorybookParams) => {
  return (
    <AnalyticsNoDataPageProvider {...mock.getServices(params)}>
      <Component {...mock.getProps()} />
    </AnalyticsNoDataPageProvider>
  );
};

Analytics.argTypes = mock.getArgumentTypes();
