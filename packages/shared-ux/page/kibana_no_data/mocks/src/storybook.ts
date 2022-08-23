/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';

import { AbstractStorybookMock, ArgumentParams } from '@kbn/shared-ux-storybook-mock';
import type {
  KibanaNoDataPageServices,
  KibanaNoDataPageProps,
} from '@kbn/shared-ux-page-kibana-no-data-types';
import type { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';

import {
  NoDataViewsPromptStorybookMock,
  NoDataViewsPromptStorybookParams,
} from '@kbn/shared-ux-prompt-no-data-views-mocks';

import {
  NoDataCardStorybookMock,
  NoDataCardStorybookParams,
} from '@kbn/shared-ux-card-no-data-mocks';

type PropArguments = Pick<NoDataPageProps, 'solution' | 'logo'>;
type ServiceArguments = Pick<KibanaNoDataPageServices, 'hasUserDataView' | 'hasESData'>;

export type Params = ArgumentParams<PropArguments, ServiceArguments> &
  NoDataCardStorybookParams &
  NoDataViewsPromptStorybookParams;

const noDataViewsMock = new NoDataViewsPromptStorybookMock();
const noDataCardMock = new NoDataCardStorybookMock();

export class StorybookMock extends AbstractStorybookMock<
  KibanaNoDataPageProps,
  KibanaNoDataPageServices,
  PropArguments,
  ServiceArguments
> {
  propArguments = {
    solution: {
      control: 'text',
      defaultValue: 'Observability',
    },
    logo: {
      control: { type: 'radio' },
      options: ['logoElastic', 'logoKibana', 'logoCloud', undefined],
      defaultValue: undefined,
    },
  };

  serviceArguments = {
    hasESData: {
      control: 'boolean',
      defaultValue: false,
    },
    hasUserDataView: {
      control: 'boolean',
      defaultValue: false,
    },
  };

  dependencies = [noDataViewsMock, noDataCardMock];

  getProps(params: Params) {
    const { logo, solution } = params;
    const noDataConfig = {
      solution: solution || 'Analytics',
      logo: logo || 'logoKibana',
      action: {
        elasticAgent: {
          title: 'Add Integrations',
        },
      },
      docsLink: 'http://docs.elastic.dev',
    };

    return { noDataConfig, onDataViewCreated: action('onDataViewCreated') };
  }

  getServices(params: Params): KibanaNoDataPageServices {
    return {
      ...noDataCardMock.getServices(params),
      ...noDataViewsMock.getServices(params),
      hasESData: () => params.hasESData,
      hasUserDataView: () => params.hasUserDataView,
    };
  }
}
