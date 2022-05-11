/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { action } from '@storybook/addon-actions';

import { NoDataViewsPrompt as NoDataViewsPromptComponent, Props } from './no_data_views.component';
import { NoDataViewsPrompt } from './no_data_views';

import mdx from '../README.mdx';

export default {
  title: 'No Data/No Data Views',
  description: 'A component to display when there are no user-created data views available.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const ConnectedComponent = () => {
  return <NoDataViewsPrompt onDataViewCreated={action('onDataViewCreated')} />;
};

type Params = Pick<Props, 'canCreateNewDataView' | 'dataViewsDocLink'>;

export const PureComponent = (params: Params) => {
  return <NoDataViewsPromptComponent onClickCreate={action('onClick')} {...params} />;
};

PureComponent.argTypes = {
  canCreateNewDataView: {
    control: 'boolean',
    defaultValue: true,
  },
  dataViewsDocLink: {
    options: ['some/link', undefined],
    control: { type: 'radio' },
  },
};
