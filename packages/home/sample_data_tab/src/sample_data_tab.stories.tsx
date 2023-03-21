/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ComponentMeta } from '@storybook/react';

import { SampleDataTab } from './sample_data_tab';

import mdx from '../README.mdx';
import { SampleDataTabProvider } from './services';
import { getStoryServices, getStoryArgTypes, Params } from './mocks';

export default {
  title: 'Sample Data/Tab Content',
  description: '',
  parameters: {
    docs: {
      page: mdx,
    },
  },
  decorators: [(Story) => <div style={{ width: 1200 }}>{Story()}</div>],
} as ComponentMeta<typeof SampleDataTab>;

export const TabContent = (params: Params) => (
  <SampleDataTabProvider {...getStoryServices(params)}>
    <SampleDataTab />
  </SampleDataTabProvider>
);

TabContent.argTypes = getStoryArgTypes();
