/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  NoDataViewsPromptStorybookMock,
  NoDataViewsPromptStorybookParams,
} from '@kbn/shared-ux-prompt-no-data-views-mocks';

import { NoDataViewsPrompt as Component } from './no_data_views';
import { NoDataViewsPromptProvider } from './services';

import mdx from '../README.mdx';

export default {
  title: 'No Data/Prompt',
  description: 'A component to display when there are no user-created data views available.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const mock = new NoDataViewsPromptStorybookMock();

export const CreateDataView = (params: NoDataViewsPromptStorybookParams) => {
  return (
    <NoDataViewsPromptProvider {...mock.getServices(params)}>
      <Component {...mock.getProps()} />
    </NoDataViewsPromptProvider>
  );
};

CreateDataView.argTypes = mock.getArgumentTypes();
