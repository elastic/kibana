/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiHealth } from '@elastic/eui';
import { InfoBlocks } from './info_blocks.component';
import type { InfoBlockItem } from './types';

const meta: Meta<typeof InfoBlocks> = {
  title: 'Info Blocks/InfoBlocks',
  component: InfoBlocks,
};
export default meta;

const SAMPLE_ITEMS: InfoBlockItem[] = [
  { title: 'Owner', value: 'Platform' },
  { title: 'Latency', value: <EuiHealth color="success">Healthy</EuiHealth> },
  { title: 'Throughput', value: '1.2k tpm' },
  { title: 'Environment', value: 'production' },
  { title: 'Error rate', value: <EuiHealth color="warning">0.4%</EuiHealth> },
  { title: 'Version', value: 'v8.19.0' },
  { title: 'Region', value: 'us-east-1' },
];

interface DefaultArgs {
  numberOfItems: number;
  compressed: boolean;
}

export const Default: StoryObj<DefaultArgs> = {
  argTypes: {
    numberOfItems: {
      description: 'Number of info blocks to render',
      control: { type: 'range', min: 2, max: 7, step: 1 },
    },
  },
  args: {
    numberOfItems: 3,
    compressed: false,
  },
  render: ({ numberOfItems, compressed }) => (
    <InfoBlocks items={SAMPLE_ITEMS.slice(0, numberOfItems)} compressed={compressed} />
  ),
};

type Story = StoryObj<typeof InfoBlocks>;

export const Compressed: Story = {
  args: {
    items: SAMPLE_ITEMS.slice(0, 3),
    compressed: true,
  },
};
