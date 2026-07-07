/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps } from 'react';
import type { StoryObj, Meta } from '@storybook/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { NumberBadge } from '.';

/**
 * @description story for helper companion components for the data cascade component',
 */
export default {
  title: 'Data Cascade/Helper components',
} satisfies Meta;

export const Helpers: StoryObj<ComponentProps<typeof NumberBadge>> = {
  name: 'Number Badge',
  render: (args) => {
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <NumberBadge value={args.value} shortenAtExpSize={args.shortenAtExpSize} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  },
  argTypes: {
    value: {
      name: 'Value',
      type: 'number' as const,
      description: 'The numeric value to display in the badge',
    },
    shortenAtExpSize: {
      name: 'Shorten At Exp Size',
      type: 'number' as const,
      description: 'The number of digits at which to shorten the value',
    },
  },
  args: {
    value: 123456789,
    shortenAtExpSize: 3,
  },
};
