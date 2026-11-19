/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { FindingsPanel } from '../findings_panel';
import { states } from './fixtures';
import { withResourceTypes } from './decorators';

const meta: Meta<typeof FindingsPanel> = {
  title: 'Housekeeping/Findings panel',
  component: FindingsPanel,
  decorators: [withResourceTypes],
  args: { onRetry: action('onRetry') },
};
export default meta;

type Story = StoryObj<typeof FindingsPanel>;

export const Loading: Story = { args: { state: states.loading } };
export const WithFindings: Story = { args: { state: states.loaded } };
export const WithSkippedChecks: Story = { args: { state: states.withSkipped } };
export const AllClear: Story = { args: { state: states.allClear } };
export const NoIssuesInTheChecksThatRan: Story = { args: { state: states.partialClear } };
export const RequestFailed: Story = { args: { state: states.error } };
export const RerunFailed: Story = {
  args: { state: { ...states.loaded, error: 'Request failed with status code 500' } },
};
