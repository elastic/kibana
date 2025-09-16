/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StoryObj } from '@storybook/react';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';
import { WorkflowDetailHeader } from './workflow_detail_header';

export default {
  component: WorkflowDetailHeader,
  title: 'Workflows Management/Workflow Detail Header',
  decorators: [kibanaReactDecorator],
};

type Story = StoryObj<typeof WorkflowDetailHeader>;

export const Default: Story = {
  args: {
    isLoading: false,
    name: 'Very extra super long title that should be truncated',
    activeTab: 'workflow',
    canRunWorkflow: true,
    canSaveWorkflow: true,
    isEnabled: true,
    handleRunClick: () => {},
    handleSave: () => {},
    handleToggleWorkflow: () => {},
    handleTestClick: () => {},
    handleTabChange: () => {},
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    name: undefined,
    activeTab: 'workflow',
    canRunWorkflow: true,
    canSaveWorkflow: true,
    isEnabled: true,
    handleRunClick: () => {},
    handleSave: () => {},
    handleToggleWorkflow: () => {},
    handleTestClick: () => {},
    handleTabChange: () => {},
  },
};

export const Disabled: Story = {
  args: {
    isLoading: false,
    name: 'Very extra super long title that should be truncated',
    activeTab: 'workflow',
    canRunWorkflow: false,
    canSaveWorkflow: false,
    isEnabled: false,
    handleRunClick: () => {},
    handleSave: () => {},
    handleToggleWorkflow: () => {},
    handleTestClick: () => {},
    handleTabChange: () => {},
  },
};
