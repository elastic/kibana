/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import { AbstractStorybookMocks } from '@kbn/shared-ux-storybook-mocks';
import { NoDataViewsPromptServices } from '@kbn/shared-ux-prompt-no-data-views-types';

type ServiceArguments = Pick<
  NoDataViewsPromptServices,
  'canCreateNewDataView' | 'dataViewsDocLink'
>;

export type Params = Record<keyof ServiceArguments, any>;

export class StorybookMocks extends AbstractStorybookMocks<
  {},
  ServiceArguments,
  NoDataViewsPromptServices
> {
  propArguments = {};
  serviceArguments = {
    canCreateNewDataView: {
      control: 'boolean',
      defaultValue: true,
    },
    dataViewsDocLink: {
      options: ['some/link', undefined],
      control: { type: 'radio' },
    },
  };
  dependencies = [];

  getServices(params: Params): NoDataViewsPromptServices {
    const { canCreateNewDataView, dataViewsDocLink } = params;

    return {
      canCreateNewDataView,
      dataViewsDocLink,
      openDataViewEditor: (options) => {
        action('openDataViewEditor')(options);
        return () => {};
      },
    };
  }
}
