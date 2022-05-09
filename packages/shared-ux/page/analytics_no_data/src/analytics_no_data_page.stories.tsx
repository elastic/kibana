/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { servicesFactory, DataServiceFactoryConfig } from '@kbn/shared-ux-storybook';

import { AnalyticsNoDataPage as Component } from './analytics_no_data_page';
import { AnalyticsNoDataPageProvider, Services } from './services';
import mdx from '../README.mdx';

export default {
  title: 'Analytics No Data Page',
  description: 'An Analytics-specific version of KibanaNoDataPage.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

type Params = Pick<DataServiceFactoryConfig, 'hasESData' | 'hasUserDataView'>;

export const AnalyticsNoDataPage = (params: Params) => {
  // Workaround to leverage the services package.
  const { application, data, docLinks, editors, http, permissions, platform } =
    servicesFactory(params);

  const services: Services = {
    ...application,
    ...data,
    ...docLinks,
    ...editors,
    ...http,
    ...permissions,
    ...platform,
    kibanaGuideDocLink: 'Kibana guide',
  };

  return (
    <AnalyticsNoDataPageProvider {...services}>
      <Component onDataViewCreated={action('onDataViewCreated')} />
    </AnalyticsNoDataPageProvider>
  );
};

AnalyticsNoDataPage.argTypes = {
  hasESData: {
    control: 'boolean',
    defaultValue: false,
  },
  hasUserDataView: {
    control: 'boolean',
    defaultValue: false,
  },
};
