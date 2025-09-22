/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';

import type {
  NoDataConfigPageProps,
  NoDataConfigPageServices,
} from '@kbn/shared-ux-page-no-data-config-types';
import { NoDataPageStorybookMock } from '@kbn/shared-ux-page-no-data-mocks';
import type { NoDataPageStorybookParams } from '@kbn/shared-ux-page-no-data-mocks';

export type Params = NoDataPageStorybookParams;

const dataPageMock = new NoDataPageStorybookMock();

export class NoDataConfigPageStorybookMock extends AbstractStorybookMock<
  NoDataConfigPageProps,
  NoDataConfigPageServices
> {
  propArguments = {};
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
      },
    };
  }

  getServices(params: NoDataPageStorybookParams): NoDataConfigPageServices {
    return { ...dataPageMock.getServices(params) };
  }
}
