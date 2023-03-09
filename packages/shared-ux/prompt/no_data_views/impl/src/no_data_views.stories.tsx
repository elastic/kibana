/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';

import {
  NoDataViewsPromptStorybookMock,
  NoDataViewsPromptStorybookParams,
} from '@kbn/shared-ux-prompt-no-data-views-mocks';
import { getMetaElementParameters } from '@kbn/shared-ux-storybook-docs';

import { NoDataViewsPrompt } from './no_data_views';
import { NoDataViewsPromptProvider } from './services';

import content, { attributes } from '../README.mdx';

export default {
  title: 'No Data/Prompt',
  description: 'A component to display when there are no user-created data views available.',
  parameters: getMetaElementParameters(attributes, content),
};

const mock = new NoDataViewsPromptStorybookMock();

export const Prompt = (params: NoDataViewsPromptStorybookParams) => {
  return (
    <NoDataViewsPromptProvider {...mock.getServices(params)}>
      <NoDataViewsPrompt {...mock.getProps()} />
    </NoDataViewsPromptProvider>
  );
};

Prompt.argTypes = mock.getArgumentTypes();
