/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { action } from '@storybook/addon-actions';
import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import {
  NoDataViewsPromptServices,
  NoDataViewsPromptProps,
} from '@kbn/shared-ux-prompt-no-data-views-types';

type ServiceArguments = Pick<
  NoDataViewsPromptServices,
  'canCreateNewDataView' | 'dataViewsDocLink' | 'esqlDocLink'
> & { canTryEsql: boolean };

export type Params = Record<keyof ServiceArguments, any>;

export class StorybookMock extends AbstractStorybookMock<
  NoDataViewsPromptProps,
  NoDataViewsPromptServices,
  {},
  ServiceArguments
> {
  propArguments = {};
  serviceArguments = {
    canCreateNewDataView: {
      control: 'boolean',
      defaultValue: true,
    },
    dataViewsDocLink: {
      options: ['dataviews/link', undefined],
      control: { type: 'radio' },
      defaultValue: 'dataviews/link',
    },
    canTryEsql: {
      control: 'boolean',
      defaultValue: true,
    },
    esqlDocLink: {
      options: ['esql/link', undefined],
      control: { type: 'radio' },
      defaultValue: 'esql/link',
    },
  };
  dependencies = [];

  getProps() {
    return {
      onDataViewCreated: action('onDataViewCreated'),
    };
  }

  getServices(params: Params): NoDataViewsPromptServices {
    const { canCreateNewDataView, dataViewsDocLink, canTryEsql, esqlDocLink } = params;
    let onTryESQL;

    if (canTryEsql !== false) {
      onTryESQL = action('onTryESQL-from-services');
    }

    return {
      canCreateNewDataView,
      dataViewsDocLink,
      esqlDocLink,
      openDataViewEditor: (options) => {
        action('openDataViewEditor')(options);
        return () => {};
      },
      onTryESQL,
    };
  }
}
