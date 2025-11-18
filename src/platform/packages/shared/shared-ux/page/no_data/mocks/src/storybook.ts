/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import type { NoDataPageProps, NoDataPageServices } from '@kbn/shared-ux-page-no-data-types';
import { NoDataCardStorybookMock } from '@kbn/shared-ux-card-no-data-mocks';
import type { NoDataCardStorybookParams } from '@kbn/shared-ux-card-no-data-mocks';

const dataCardMock = new NoDataCardStorybookMock();
export type Params = NoDataCardStorybookParams;

export class NoDataPageStorybookMock extends AbstractStorybookMock<
  NoDataPageProps,
  NoDataPageServices
> {
  propArguments = {};
  serviceArguments = {};

  dependencies = [dataCardMock];

  getProps(params?: NoDataCardStorybookParams): NoDataPageProps {
    return {
      action: {
        elasticAgent: {
          title: 'Add Integrations',
        },
      },
    };
  }

  getServices(params: NoDataCardStorybookParams): NoDataPageServices {
    return { ...dataCardMock.getServices(params) };
  }
}
