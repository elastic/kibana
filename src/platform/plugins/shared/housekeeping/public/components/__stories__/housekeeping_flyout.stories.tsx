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
import { action } from '@storybook/addon-actions';
import { EuiFlyout } from '@elastic/eui';
import { HousekeepingFlyoutContent } from '../housekeeping_flyout';
import { states } from './fixtures';
import { withResourceTypes } from './decorators';

const meta: Meta<typeof HousekeepingFlyoutContent> = {
  title: 'Housekeeping/Flyout',
  component: HousekeepingFlyoutContent,
  decorators: [withResourceTypes],
  args: { onRerun: action('onRerun'), onClose: action('onClose') },
  render: (args) => (
    <EuiFlyout size="m" ownFocus onClose={args.onClose} aria-labelledby="housekeepingFlyoutTitle">
      <HousekeepingFlyoutContent {...args} />
    </EuiFlyout>
  ),
};
export default meta;

type Story = StoryObj<typeof HousekeepingFlyoutContent>;

export const Loading: Story = { args: { state: states.loading } };
export const WithFindings: Story = { args: { state: states.loaded } };
export const ScopedToAPage: Story = {
  args: {
    state: states.loaded,
    fullReport: { href: '#/stack/housekeeping', onClick: action('fullReport.onClick') },
  },
};
export const Rerunning: Story = { args: { state: states.rerunning } };
export const WithSkippedChecks: Story = { args: { state: states.withSkipped } };
export const AllClear: Story = { args: { state: states.allClear } };
