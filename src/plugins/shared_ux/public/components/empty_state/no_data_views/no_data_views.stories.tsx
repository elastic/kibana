/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { action } from '@storybook/addon-actions';

import { docLinksServiceFactory } from '../../../services/storybook/doc_links';

import { NoDataViews as NoDataViewsComponent, Props } from './no_data_views.component';
import { NoDataViews } from './no_data_views';

import mdx from './no_data_views.mdx';

export default {
  title: 'No Data Views',
  description: 'A component to display when there are no user-created data views available.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const ConnectedComponent = () => {
  return (
    <NoDataViews
      onDataViewCreated={action('onDataViewCreated')}
      dataViewsDocLink={docLinksServiceFactory().dataViewsDocsLink}
    />
  );
};

type Params = Pick<Props, 'canCreateNewDataView' | 'dataViewsDocLink'>;

export const PureComponent = (params: Params) => {
  return <NoDataViewsComponent onClickCreate={action('onClick')} {...params} />;
};

PureComponent.argTypes = {
  canCreateNewDataView: {
    control: 'boolean',
    defaultValue: true,
  },
  dataViewsDocLink: {
    options: [docLinksServiceFactory().dataViewsDocsLink, undefined],
    control: { type: 'radio' },
  },
};
