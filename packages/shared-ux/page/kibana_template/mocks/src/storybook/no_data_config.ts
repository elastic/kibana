/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import type { ArgumentParams } from '@kbn/shared-ux-storybook-mock';

import { NoDataConfigPageStorybookMock } from '@kbn/shared-ux-page-no-data-config-mocks';
import type { NoDataConfigPageStorybookParams } from '@kbn/shared-ux-page-no-data-config-mocks';

import type {
  NoDataConfig,
  KibanaPageTemplateProps,
  KibanaPageTemplateServices,
} from '@kbn/shared-ux-page-kibana-template-types';

export type NoDataConfigArguments = Pick<
  NoDataConfig,
  'solution' | 'logo' | 'docsLink' | 'pageTitle'
>;

type PropArguments = NoDataConfigArguments;

export type Params = ArgumentParams<PropArguments, {}> & NoDataConfigPageStorybookParams;

const noDataConfigMock = new NoDataConfigPageStorybookMock();

export const noDataConfigArguments: ArgumentParams<NoDataConfigArguments> = {
  solution: {
    control: 'text',
    defaultValue: 'Observability',
  },
  logo: {
    control: { type: 'radio' },
    options: ['logoElastic', 'logoKibana', 'logoCloud', undefined],
    defaultValue: undefined,
  },
  docsLink: {
    control: 'text',
    defaultValue: 'docs/link',
  },
  pageTitle: {
    control: 'text',
    defaultValue: '',
  },
};

export class StorybookMock extends AbstractStorybookMock<
  KibanaPageTemplateProps,
  KibanaPageTemplateServices,
  PropArguments
> {
  propArguments = {
    ...noDataConfigArguments,
  };

  serviceArguments = {};

  dependencies = [noDataConfigMock];

  getProps(params?: Params): KibanaPageTemplateProps {
    const result: KibanaPageTemplateProps = {
      noDataConfig: {
        action: {
          elasticAgent: {
            title: 'Add Integrations',
          },
        },
        solution: this.getArgumentValue('solution', params),
        logo: this.getArgumentValue('logo', params),
        docsLink: this.getArgumentValue('docsLink', params),
        pageTitle: this.getArgumentValue('pageTitle', params),
      },
    };

    return result;
  }

  getServices(params: Params): KibanaPageTemplateServices {
    return { ...noDataConfigMock.getServices(params) };
  }
}
