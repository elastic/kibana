/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { action } from '@storybook/addon-actions';

import { AbstractStorybookMock, ArgumentParams } from '@kbn/shared-ux-storybook-mock';
import { KibanaNoDataPageStorybookMock } from '@kbn/shared-ux-page-kibana-no-data-mocks';
import type { KibanaNoDataPageStorybookParams } from '@kbn/shared-ux-page-kibana-no-data-mocks';
import type {
  AnalyticsNoDataPageServices,
  AnalyticsNoDataPageProps,
} from '@kbn/shared-ux-page-analytics-no-data-types';
import { of } from 'rxjs';

interface PropArguments {
  useCustomOnTryESQL: boolean;
}

type ServiceArguments = Pick<AnalyticsNoDataPageServices, 'kibanaGuideDocLink' | 'customBranding'>;

export type Params = ArgumentParams<PropArguments, ServiceArguments> &
  KibanaNoDataPageStorybookParams;

const kibanaNoDataMock = new KibanaNoDataPageStorybookMock();

export class StorybookMock extends AbstractStorybookMock<
  AnalyticsNoDataPageProps,
  AnalyticsNoDataPageServices,
  {},
  ServiceArguments
> {
  propArguments = {
    // requires hasESData to be toggled to true
    useCustomOnTryESQL: {
      control: 'boolean',
      defaultValue: false,
    },
  };
  serviceArguments = {
    kibanaGuideDocLink: {
      control: 'text',
      defaultValue: 'Kibana guide',
    },
    customBranding: {
      hasCustomBranding$: {
        control: 'boolean',
        defaultValue: false,
      },
    },
  };

  dependencies = [kibanaNoDataMock];

  getServices(params: Params): AnalyticsNoDataPageServices {
    return {
      kibanaGuideDocLink: 'Kibana guide',
      customBranding: {
        hasCustomBranding$: of(false),
      },
      pageFlavor: 'kibana',
      prependBasePath: (path) => path,
      getHttp: <T>() => Promise.resolve({} as T),
      ...kibanaNoDataMock.getServices(params),
    };
  }

  getProps(params: Params) {
    return {
      onDataViewCreated: action('onDataViewCreated'),
      onTryESQL: params.useCustomOnTryESQL ? action('onTryESQL-from-props') : undefined,
    };
  }
}
