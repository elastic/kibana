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
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ResourceName, ResourceTypeBadge } from '../resource_badge';
import { resourceTypes } from './fixtures';
import { withResourceTypes } from './decorators';

const meta: Meta<typeof ResourceTypeBadge> = {
  title: 'Housekeeping/Resource',
  component: ResourceTypeBadge,
  decorators: [withResourceTypes],
};
export default meta;

type Story = StoryObj<typeof ResourceTypeBadge>;

export const TypeBadge: Story = { args: { type: 'data_stream' } };

export const UnknownType: Story = { args: { type: 'transform' } };

export const AllTypes: Story = {
  render: () => (
    <EuiFlexGroup gutterSize="s" wrap>
      {Object.keys(resourceTypes).map((type) => (
        <EuiFlexItem grow={false} key={type}>
          <ResourceTypeBadge type={type} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  ),
};

export const LinkedName: Story = {
  render: () => <ResourceName resource={{ type: 'data_stream', id: 'logs-app-default' }} />,
};
