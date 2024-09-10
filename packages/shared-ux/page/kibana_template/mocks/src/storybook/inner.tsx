/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import type { ArgumentParams } from '@kbn/shared-ux-storybook-mock';

import { NoDataConfigPageStorybookMock } from '@kbn/shared-ux-page-no-data-config-mocks';
import type { NoDataConfigPageStorybookParams } from '@kbn/shared-ux-page-no-data-config-mocks';

import type {
  KibanaPageTemplateProps,
  KibanaPageTemplateServices,
} from '@kbn/shared-ux-page-kibana-template-types';

type PageHeader = NonNullable<KibanaPageTemplateProps['pageHeader']>;
export type PageHeaderArguments = Pick<
  PageHeader,
  'iconType' | 'pageTitle' | 'description' | 'rightSideItems'
>;

type PropArguments = Pick<KibanaPageTemplateProps, 'isEmptyState'> & PageHeaderArguments;

export type Params = ArgumentParams<PropArguments, {}> & NoDataConfigPageStorybookParams;

const noDataConfigMock = new NoDataConfigPageStorybookMock();

export const pageHeaderArguments: ArgumentParams<PropArguments> = {
  isEmptyState: {
    control: 'boolean',
    defaultValue: false,
  },
  iconType: {
    control: { type: 'radio' },
    options: ['logoElastic', 'logoKibana', 'logoCloud', undefined],
    defaultValue: undefined,
  },
  pageTitle: {
    control: 'text',
    defaultValue: 'Page title',
  },
  description: {
    control: 'text',
    defaultValue: 'Page description',
  },
  rightSideItems: {
    control: 'boolean',
    defaultValue: true,
  },
};

const rightSideItems: PageHeaderArguments['rightSideItems'] = [
  <span>First Item</span>,
  <span>Second Item</span>,
];

export class StorybookMock extends AbstractStorybookMock<
  KibanaPageTemplateProps,
  KibanaPageTemplateServices,
  PropArguments
> {
  propArguments = {
    ...pageHeaderArguments,
  };

  serviceArguments = {};

  dependencies = [];

  getProps(params?: Params): KibanaPageTemplateProps {
    const result: KibanaPageTemplateProps = {
      isEmptyState: this.getArgumentValue('isEmptyState', params),
      pageHeader: {
        iconType: this.getArgumentValue('iconType', params),
        pageTitle: this.getArgumentValue('pageTitle', params),
        description: this.getArgumentValue('description', params),
        rightSideItems: this.getArgumentValue('rightSideItems', params)
          ? rightSideItems
          : undefined,
      },
    };

    return result;
  }

  getServices(params: Params): KibanaPageTemplateServices {
    return { ...noDataConfigMock.getServices(params) };
  }
}
