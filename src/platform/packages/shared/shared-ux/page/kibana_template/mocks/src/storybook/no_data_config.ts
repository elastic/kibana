/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';

import { NoDataConfigPageStorybookMock } from '@kbn/shared-ux-page-no-data-config-mocks';
import type { NoDataConfigPageStorybookParams } from '@kbn/shared-ux-page-no-data-config-mocks';

import type {
  KibanaPageTemplateProps,
  KibanaPageTemplateServices,
} from '@kbn/shared-ux-page-kibana-template-types';

export type Params = NoDataConfigPageStorybookParams;

const noDataConfigMock = new NoDataConfigPageStorybookMock();

export class StorybookMock extends AbstractStorybookMock<
  KibanaPageTemplateProps,
  KibanaPageTemplateServices
> {
  propArguments = {};
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
      },
    };

    return result;
  }

  getServices(params: Params): KibanaPageTemplateServices {
    return { ...noDataConfigMock.getServices(params) };
  }
}
