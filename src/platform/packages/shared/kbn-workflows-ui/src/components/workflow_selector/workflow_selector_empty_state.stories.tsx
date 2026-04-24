/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPanel } from '@elastic/eui';
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { WorkflowSelectorEmptyState } from './workflow_selector_empty_state';

const meta: Meta<typeof WorkflowSelectorEmptyState> = {
  title: 'Workflows/WorkflowSelectorEmptyState',
  component: WorkflowSelectorEmptyState,
  decorators: [
    (Story) => (
      <EuiPanel style={{ maxWidth: 300 }}>
        <Story />
      </EuiPanel>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WorkflowSelectorEmptyState>;

export const Default: Story = {
  args: {
    createWorkflowHref: '/app/workflows',
  },
};
