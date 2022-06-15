/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { NoDataCard } from './no_data_card';
import mdx from '../README.mdx';

export default {
  title: 'Card',
  description: 'A wrapper around EuiCard, to be used on NoData page',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const argTypes = {
  title: {
    control: {
      type: 'text',
    },
    defaultValue: 'Add data',
  },
  button: {
    control: {
      type: 'text',
    },
    defaultValue: '',
  },
  description: {
    control: {
      type: 'text',
    },
    defaultValue: '',
  },
};

type Params = Record<keyof typeof argTypes, any>;

export const NoData = (params: Params) => {
  return <NoDataCard {...params} />;
};

NoData.argTypes = argTypes;
