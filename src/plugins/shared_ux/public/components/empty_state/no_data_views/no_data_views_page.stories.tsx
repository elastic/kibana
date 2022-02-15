/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { action } from '@storybook/addon-actions';
import { NoDataViewsPage } from './no_data_views_page';
import { NoDataViewsComponent } from './no_data_views_component';
import mdx from './no_data_views_page.mdx';
import { docLinksServiceFactory } from '../../../services/storybook/doc_links';

export default {
  title: 'No Data Views Page',
  description: 'A page that displays when there are no user-created data views',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const ConnectedComponent = () => {
  return (
    <NoDataViewsPage
      onDataViewCreated={action('onDataViewCreated')}
      dataViewsDocLink={docLinksServiceFactory().dataViewsDocsLink}
    />
  );
};

ConnectedComponent.argTypes = {
  openEditor: action('openEditor'),
};

export const PureComponent = ({
  canCreateNewDataView = true,
  dataViewDocLinks,
}: {
  canCreateNewDataView: boolean;
  dataViewDocLinks: string | undefined;
}) => {
  return (
    <NoDataViewsComponent
      canCreateNewDataView={canCreateNewDataView}
      onClick={action('onClick')}
      dataViewsDocLink={dataViewDocLinks}
    />
  );
};

PureComponent.argTypes = {
  canCreateNewDataView: {
    control: 'boolean',
    defaultValue: true,
  },
  dataViewDocLinks: {
    options: [docLinksServiceFactory().dataViewsDocsLink, undefined],
    control: { type: 'radio' },
  },
};
