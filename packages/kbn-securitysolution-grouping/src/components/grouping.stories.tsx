/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Story } from '@storybook/react';
import React from 'react';
import readme from '../../README.mdx';
import { Grouping } from './grouping';
import { mockGroupingProps } from './grouping.mock';

export default {
  component: Grouping,
  title: 'Grouping',
  description: 'A group of accordion components that each renders a given child component',
  parameters: {
    docs: {
      page: readme,
    },
  },
};

export const Empty: Story<void> = () => {
  return <Grouping {...mockGroupingProps} />;
};
