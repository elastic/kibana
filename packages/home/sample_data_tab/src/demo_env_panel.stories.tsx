/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ComponentMeta } from '@storybook/react';

import { DemoEnvironmentPanel } from './demo_env_panel';

import mdx from '../README.mdx';

export default {
  title: 'Sample Data/Demo Panel',
  description: '',
  parameters: {
    docs: {
      page: mdx,
    },
  },
  decorators: [(Story) => <div style={{ width: 1200 }}>{Story()}</div>],
} as ComponentMeta<typeof DemoEnvironmentPanel>;

export const DemoPanel = () => <DemoEnvironmentPanel demoUrl="https://google.com" />;
