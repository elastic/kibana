/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { NoDataCard } from './no_data_card';
import type { NoDataCardProps } from './types';

export default {
  title: 'Page Template/No Data Page/No Data Card',
  description: 'A wrapper around EuiCard, to be used on NoData page',
};

type Params = Pick<NoDataCardProps, 'button' | 'description'>;

export const PureComponent = (params: Params) => {
  return <NoDataCard title={'Add data'} {...params} />;
};

PureComponent.argTypes = {
  button: {
    control: {
      type: 'text',
    },
    defaultValue: 'Button text',
  },
  description: {
    control: {
      type: 'text',
    },
    defaultValue: 'This is a description',
  },
};
