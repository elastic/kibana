/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { mockGroupingProps } from './grouping.mock';
import { Grouping } from './grouping';

export default {
  component: Grouping,
  title: 'Grouping/Grouping',
};

export const Emtpy: Story<void> = () => {
  return <Grouping {...mockGroupingProps} />;
};
