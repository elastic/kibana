/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { servicesFactory } from '@kbn/shared-ux-storybook';
import { AbstractStorybookMocks } from '@kbn/shared-ux-storybook-mocks';
import type { KibanaNoDataPageServices } from '@kbn/shared-ux-page-kibana-no-data-types';
import type { NoDataPageProps } from '@kbn/shared-ux-components';

import {
  NoDataViewsPromptStorybookMocks,
  NoDataViewsPromptStorybookParams,
} from '@kbn/shared-ux-prompt-no-data-views-mocks';

import {
  NoDataCardStorybookMocks,
  NoDataCardStorybookParams,
} from '@kbn/shared-ux-card-no-data-mocks';

type PropArguments = Pick<NoDataPageProps, 'solution' | 'logo'>;
type ServiceArguments = Pick<KibanaNoDataPageServices, 'hasUserDataView' | 'hasESData'>;
type Arguments = PropArguments & ServiceArguments;

export type Params = NoDataViewsPromptStorybookParams &
  NoDataCardStorybookParams &
  Record<keyof Arguments, any>;

export class StorybookMocks extends AbstractStorybookMocks<
  PropArguments,
  ServiceArguments,
  KibanaNoDataPageServices
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

  dependencies = [NoDataViewsPromptStorybookMocks, NoDataCardStorybookMocks];

  getServices(params: Params): KibanaNoDataPageServices {
    // Workaround to leverage the services package.
    const { application, data, docLinks, editors, http, permissions, platform } =
      servicesFactory(params);

    return {
      ...application,
      ...data,
      ...docLinks,
      ...editors,
      ...http,
      ...permissions,
      ...platform,
      hasESData: () => params.hasESData,
      hasUserDataView: () => params.hasUserDataView,
      ...NoDataViewsPromptStorybookMocks.getServices(params),
      ...NoDataCardStorybookMocks.getServices(params),
    };
  }
}
