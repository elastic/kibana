/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { servicesFactory, DataServiceFactoryConfig } from '@kbn/shared-ux-storybook';
import { SharedUxServicesProvider } from '@kbn/shared-ux-services';
import mdx from './kibana_no_data_page.mdx';
import { NoDataPageProps } from '../page_template';
import { KibanaNoDataPage } from './kibana_no_data_page';

export default {
  title: 'No Data/Kibana No Data Page',
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

type Params = Pick<NoDataPageProps, 'solution' | 'logo'> & DataServiceFactoryConfig;

export const PureComponent = (params: Params) => {
  const { solution, logo, hasESData, hasUserDataView } = params;

  const serviceParams = { hasESData, hasUserDataView, hasDataViews: false };
  const services = servicesFactory({ ...serviceParams, hasESData, hasUserDataView });
  return (
    <SharedUxServicesProvider {...services}>
      <KibanaNoDataPage
        onDataViewCreated={action('onDataViewCreated')}
        noDataConfig={{ ...noDataConfig, solution, logo }}
      />
    </SharedUxServicesProvider>
  );
};

export const PureComponentLoadingState = () => {
  const dataCheck = () => new Promise<boolean>((resolve, reject) => {});
  const services = {
    ...servicesFactory({ hasESData: false, hasUserDataView: false, hasDataViews: false }),
    data: {
      hasESData: dataCheck,
      hasUserDataView: dataCheck,
      hasDataView: dataCheck,
    },
  };
  return (
    <SharedUxServicesProvider {...services}>
      <KibanaNoDataPage
        onDataViewCreated={action('onDataViewCreated')}
        noDataConfig={noDataConfig}
      />
    </SharedUxServicesProvider>
  );
};

PureComponent.argTypes = {
  solution: {
    control: 'text',
    defaultValue: 'Observability',
  },
  logo: {
    control: { type: 'radio' },
    options: ['logoElastic', 'logoKibana', 'logoCloud', undefined],
    defaultValue: undefined,
  },
  hasESData: {
    control: 'boolean',
    defaultValue: false,
  },
  hasUserDataView: {
    control: 'boolean',
    defaultValue: false,
  },
};
