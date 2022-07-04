/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { Params, getStoryArgTypes, getStoryServices } from './mocks';

import { NoDataCard as Component } from './no_data_card.component';
import { NoDataCard as ConnectedComponent } from './no_data_card';
import { NoDataCardProvider } from './services';

import mdx from '../README.mdx';

export default {
  title: 'No Data/Card',
  description: 'A solution-specific wrapper around `EuiCard`, to be used on `NoData` page',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const argTypes = getStoryArgTypes();

export const NoDataCard = (params: Params) => {
  return (
    <NoDataCardProvider {...getStoryServices(params)}>
      <ConnectedComponent {...params} />
    </NoDataCardProvider>
  );
};

NoDataCard.argTypes = argTypes;

export const NoDataCardComponent = (params: Params) => {
  return <Component {...params} />;
};

NoDataCardComponent.argTypes = argTypes;
