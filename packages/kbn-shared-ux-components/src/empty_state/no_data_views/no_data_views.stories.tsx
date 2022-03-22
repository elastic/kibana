/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { action } from '@storybook/addon-actions';

import { servicesFactory } from '@kbn/shared-ux-storybook';

import { NoDataViews as NoDataViewsComponent, Props } from './no_data_views.component';
import { NoDataViews } from './no_data_views';

import mdx from './no_data_views.mdx';

const services = servicesFactory({});

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
  return <NoDataViews onDataViewCreated={action('onDataViewCreated')} />;
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
    options: [services.docLinks.dataViewsDocLink, undefined],
    control: { type: 'radio' },
  },
};
