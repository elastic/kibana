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
import type { NoDataPageProps, NoDataPageServices } from '@kbn/shared-ux-page-no-data-types';
import { NoDataCardStorybookMock } from '@kbn/shared-ux-card-no-data-mocks';
import type { NoDataCardStorybookParams } from '@kbn/shared-ux-card-no-data-mocks';

type PropArguments = Pick<NoDataPageProps, 'solution' | 'logo' | 'docsLink' | 'pageTitle'>;

export type Params = ArgumentParams<PropArguments, {}> & NoDataCardStorybookParams;

const dataCardMock = new NoDataCardStorybookMock();

export class NoDataPageStorybookMock extends AbstractStorybookMock<
  NoDataPageProps,
  NoDataPageServices,
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

  dependencies = [dataCardMock];

  getProps(params?: Params): NoDataPageProps {
    return {
      action: {
        elasticAgent: {
          title: 'Add Integrations',
        },
      },
      solution: this.getArgumentValue('solution', params),
      logo: this.getArgumentValue('logo', params),
      docsLink: this.getArgumentValue('docsLink', params),
      pageTitle: this.getArgumentValue('pageTitle', params),
    };
  }

  getServices(params: Params): NoDataPageServices {
    return { ...dataCardMock.getServices(params) };
  }
}
