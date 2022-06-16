/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { Params, getStoryArgTypes, getStoryServices } from './mocks';

import { NoDataCard as NoDataCardComponent } from './no_data_card.component';
import { NoDataCard } from './no_data_card';
import { NoDataCardProvider } from './services';

import mdx from '../README.mdx';

export default {
  title: 'Card/No Data Card',
  description: 'A solution-specific wrapper around `EuiCard`, to be used on `NoData` page',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const argTypes = getStoryArgTypes();

export const Component = (params: Params) => {
  return <NoDataCardComponent {...params} />;
};

Component.argTypes = argTypes;

export const ConnectedComponent = (params: Params) => {
  return (
    <NoDataCardProvider {...getStoryServices(params)}>
      <NoDataCard {...params} />
    </NoDataCardProvider>
  );
};

ConnectedComponent.argTypes = argTypes;
