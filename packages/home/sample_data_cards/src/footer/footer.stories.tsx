/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ComponentMeta } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { Params, getStoryArgTypes, getStoryServices, mockDataSet } from '../mocks';
import { SampleDataCardsProvider } from '../services';
import { Footer as Component } from '.';

import type { SampleDataSet } from '../types';

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
  const { includeAppLinks, ...rest } = params;
  const sampleDataSet: SampleDataSet = {
    ...mockDataSet,
    ...rest,
    appLinks: includeAppLinks ? mockDataSet.appLinks : [],
  };

  return (
    <SampleDataCardsProvider {...getStoryServices(params)}>
      <Component sampleDataSet={sampleDataSet} onAction={action('onAction')} />
    </SampleDataCardsProvider>
  );
};

CardFooter.argTypes = argTypes;
