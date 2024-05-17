/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import { ComponentMeta } from '@storybook/react';
import React from 'react';

import type { SampleDataSet } from '@kbn/home-sample-data-types';
import { Footer as Component } from '.';
import { Params, getStoryArgTypes, getStoryServices, mockDataSet } from '../mocks';
import { SampleDataCardProvider } from '../services';

import mdx from '../../README.mdx';

export default {
  title: 'Sample Data/Card Footer',
  description: '',
  parameters: {
    docs: {
      page: mdx,
    },
  },
  decorators: [(Story) => <div style={{ width: '433px', padding: '25px' }}>{Story()}</div>],
} as ComponentMeta<typeof Component>;

const { description, ...argTypes } = getStoryArgTypes();

export const CardFooter = (params: Params) => {
  const { includeAppLinks, status, ...rest } = params;
  const sampleDataSet: SampleDataSet = {
    ...mockDataSet,
    ...rest,
    status,
    appLinks: includeAppLinks ? mockDataSet.appLinks : [],
  };

  return (
    <SampleDataCardProvider {...getStoryServices(params)}>
      <Component sampleDataSet={sampleDataSet} onAction={action('onAction')} />
    </SampleDataCardProvider>
  );
};

CardFooter.argTypes = argTypes;
