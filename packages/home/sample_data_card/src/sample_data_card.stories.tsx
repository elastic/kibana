/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ComponentMeta } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import type { SampleDataSet } from '@kbn/home-sample-data-types';
import { Params, getStoryArgTypes, getStoryServices, mockDataSet } from './mocks';
import { SampleDataCardProvider } from './services';
import { SampleDataCard } from './sample_data_card';

import mdx from '../README.mdx';

export default {
  title: 'Sample Data/Card',
  description:
    'A card describing a Sample Data Set, with options to install it, remove it, or see its saved objects.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
  decorators: [(Story) => <div style={{ width: '433px', padding: '25px' }}>{Story()}</div>],
} as ComponentMeta<typeof SampleDataCard>;

const argTypes = getStoryArgTypes();

export const Card = (params: Params) => {
  const { includeAppLinks, ...rest } = params;
  const sampleDataSet: SampleDataSet = {
    ...mockDataSet,
    ...rest,
    appLinks: includeAppLinks ? mockDataSet.appLinks : [],
  };

  return (
    <SampleDataCardProvider {...getStoryServices(params)}>
      <SampleDataCard sampleDataSet={sampleDataSet} onStatusChange={action('onStatusChange')} />
    </SampleDataCardProvider>
  );
};

Card.argTypes = argTypes;
