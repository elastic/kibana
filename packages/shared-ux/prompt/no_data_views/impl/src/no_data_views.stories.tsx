/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { action } from '@storybook/addon-actions';

import {
  NoDataViewsPromptStorybookMocks,
  NoDataViewsPromptComponentStorybookMocks,
  NoDataViewsPromptStorybookParams,
  NoDataViewsPromptComponentStorybookParams,
} from '@kbn/shared-ux-prompt-no-data-views-mocks';

import { NoDataViewsPrompt as NoDataViewsPromptComponent } from './no_data_views.component';
import { NoDataViewsPrompt } from './no_data_views';
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

export const NoDataViews = (params: NoDataViewsPromptStorybookParams) => {
  return (
    <NoDataViewsPromptProvider {...NoDataViewsPromptStorybookMocks.getServices(params)}>
      <NoDataViewsPrompt onDataViewCreated={action('onDataViewCreated')} />
    </NoDataViewsPromptProvider>
  );
};

NoDataViews.argTypes = NoDataViewsPromptStorybookMocks.getArgumentTypes();

export const NoDataViewsComponent = (params: NoDataViewsPromptComponentStorybookParams) => {
  return <NoDataViewsPromptComponent onClickCreate={action('onClick')} {...params} />;
};

NoDataViewsComponent.argTypes = NoDataViewsPromptComponentStorybookMocks.getArgumentTypes();
