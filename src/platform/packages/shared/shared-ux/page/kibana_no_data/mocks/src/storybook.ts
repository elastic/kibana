/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { action } from '@storybook/addon-actions';

import type { ArgumentParams } from '@kbn/shared-ux-storybook-mock';
import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import type {
  KibanaNoDataPageServices,
  KibanaNoDataPageProps,
} from '@kbn/shared-ux-page-kibana-no-data-types';

import type { NoDataViewsPromptStorybookParams } from '@kbn/shared-ux-prompt-no-data-views-mocks';
import { NoDataViewsPromptStorybookMock } from '@kbn/shared-ux-prompt-no-data-views-mocks';

import type { NoDataCardStorybookParams } from '@kbn/shared-ux-card-no-data-mocks';
import { NoDataCardStorybookMock } from '@kbn/shared-ux-card-no-data-mocks';

type ServiceArguments = Pick<KibanaNoDataPageServices, 'hasUserDataView' | 'hasESData'>;

export type Params = ArgumentParams<ServiceArguments> &
  NoDataCardStorybookParams &
  NoDataViewsPromptStorybookParams;

const noDataViewsMock = new NoDataViewsPromptStorybookMock();
const noDataCardMock = new NoDataCardStorybookMock();

export class StorybookMock extends AbstractStorybookMock<
  KibanaNoDataPageProps,
  KibanaNoDataPageServices,
  {},
  ServiceArguments
> {
  propArguments = {};

  serviceArguments = {
    hasESData: {
      control: { control: 'boolean' },
      defaultValue: false,
    },
    hasUserDataView: {
      control: { control: 'boolean' },
      defaultValue: false,
    },
  };

  dependencies = [noDataViewsMock, noDataCardMock];

  getProps(params: Params) {
    const noDataConfig = {
      action: {
        elasticAgent: {
          title: 'Add Integrations',
        },
      },
      docsLink: 'http://docs.elastic.dev',
    };

    return {
      showPlainSpinner: false,
      noDataConfig,
      onDataViewCreated: action('onDataViewCreated'),
    };
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
