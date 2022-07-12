/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { NoDataCardStorybookMocks } from './storybook';
import type { NoDataCardParams } from './storybook';

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

const argTypes = NoDataCardStorybookMocks.getArgumentTypes();

export const NoDataCard = (params: NoDataCardParams) => {
  return (
    <NoDataCardProvider {...NoDataCardStorybookMocks.getServices(params)}>
      <ConnectedComponent {...params} />
    </NoDataCardProvider>
  );
};

NoDataCard.argTypes = argTypes;

export const NoDataCardComponent = (params: NoDataCardParams) => {
  return <Component {...params} />;
};

NoDataCardComponent.argTypes = argTypes;
