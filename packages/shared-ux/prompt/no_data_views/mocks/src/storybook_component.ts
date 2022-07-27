/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import { NoDataViewsPromptComponentProps } from '@kbn/shared-ux-prompt-no-data-views-types';

type PropArguments = Pick<
  NoDataViewsPromptComponentProps,
  'canCreateNewDataView' | 'dataViewsDocLink' | 'emptyPromptColor'
>;

export type Params = Record<keyof PropArguments, any>;

export class StorybookComponentMocks extends AbstractStorybookMock<PropArguments, {}, {}> {
  propArguments = {
    canCreateNewDataView: {
      control: 'boolean',
      defaultValue: true,
    },
    dataViewsDocLink: {
      options: ['some/link', undefined],
      control: { type: 'radio' },
    },
    emptyPromptColor: {
      options: [
        'plain',
        'transparent',
        'subdued',
        'accent',
        'primary',
        'success',
        'warning',
        'danger',
      ],
      control: { type: 'select' },
      defaultValue: 'plain',
    },
  };
  serviceArguments = {};
  dependencies = [];

  getServices() {
    return {};
  }
}
