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

import type {
  NoDataConfig,
  NoDataConfigPageProps,
  NoDataConfigPageServices,
} from '@kbn/shared-ux-page-no-data-config-types';
import { NoDataPageStorybookMock } from '@kbn/shared-ux-page-no-data-mocks';
import type { NoDataPageStorybookParams } from '@kbn/shared-ux-page-no-data-mocks';

type PropArguments = Pick<NoDataConfig, 'solution' | 'logo' | 'docsLink' | 'pageTitle'>;

export type Params = ArgumentParams<PropArguments, {}> & NoDataPageStorybookParams;

const dataPageMock = new NoDataPageStorybookMock();

export class NoDataConfigPageStorybookMock extends AbstractStorybookMock<
  NoDataConfigPageProps,
  NoDataConfigPageServices,
  PropArguments
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
    docsLink: {
      control: 'text',
      defaultValue: 'docs/link',
    },
    pageTitle: {
      control: 'text',
      defaultValue: '',
    },
  };

  serviceArguments = {};

  dependencies = [dataPageMock];

  getProps(params?: Params): NoDataConfigPageProps {
    return {
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
  }

  getServices(params: Params): NoDataConfigPageServices {
    return { ...dataPageMock.getServices(params) };
  }
}
