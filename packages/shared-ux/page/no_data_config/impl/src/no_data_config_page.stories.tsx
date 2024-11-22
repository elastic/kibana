/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { NoDataConfigPageStorybookMock } from '@kbn/shared-ux-page-no-data-config-mocks';
import type { NoDataConfigPageStorybookParams } from '@kbn/shared-ux-page-no-data-config-mocks';

import { NoDataConfigPage as Component } from './no_data_config_page';

import { NoDataConfigPageProvider } from './services';
import mdx from '../README.mdx';

const mock = new NoDataConfigPageStorybookMock();

export default {
  title: 'No Data/Page/No Data Config Page',
  description: 'A component to display when there is no data available',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const NoDataConfigPage = (params: NoDataConfigPageStorybookParams) => {
  return (
    <NoDataConfigPageProvider {...mock.getServices(params)}>
      <Component {...mock.getProps(params)} />
    </NoDataConfigPageProvider>
  );
};

NoDataConfigPage.argTypes = mock.getArgumentTypes();
