/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { SharedUxServicesProvider } from '@kbn/shared-ux-services';
import { servicesFactory, DataServiceFactoryConfig } from '@kbn/shared-ux-storybook';
import { AnalyticsNoDataPageComponent } from './analytics_no_data_page.component';
import mdx from './analytics_no_data_page.component.mdx';

export default {
  title: 'Analytics No Data Page',
  description: 'An Analytics-specific version of KibanaNoDataPage',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

type Params = Pick<DataServiceFactoryConfig, 'hasESData' | 'hasUserDataView'>;

export const PureComponent = (params: Params) => {
  const { hasESData, hasUserDataView } = params;
  const serviceParams = { hasESData, hasUserDataView, hasDataViews: false };
  const services = servicesFactory(serviceParams);
  return (
    <SharedUxServicesProvider {...services}>
      <AnalyticsNoDataPageComponent
        onDataViewCreated={action('onDataViewCreated')}
        kibanaGuideDocLink={services.docLinks.kibanaGuideDocLink}
      />
    </SharedUxServicesProvider>
  );
};

PureComponent.argTypes = {
  hasESData: {
    control: 'boolean',
    defaultValue: false,
  },
  hasUserDataView: {
    control: 'boolean',
    defaultValue: false,
  },
};
