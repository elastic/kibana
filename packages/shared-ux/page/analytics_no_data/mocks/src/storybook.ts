/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

type ServiceArguments = Pick<AnalyticsNoDataPageServices, 'kibanaGuideDocLink' | 'customBranding'>;

export type Params = ArgumentParams<{}, ServiceArguments> & KibanaNoDataPageStorybookParams;

const kibanaNoDataMock = new KibanaNoDataPageStorybookMock();

export class StorybookMock extends AbstractStorybookMock<
  AnalyticsNoDataPageProps,
  AnalyticsNoDataPageServices,
  {},
  ServiceArguments
> {
  propArguments = {};
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
      ...kibanaNoDataMock.getServices(params),
    };
  }

  getProps() {
    return {
      onDataViewCreated: action('onDataViewCreated'),
    };
  }
}
