/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import { SummaryPanel } from '../summary_panel';
import { loadedAt, response, states } from './fixtures';

const meta: Meta<typeof SummaryPanel> = {
  title: 'Housekeeping/Summary panel',
  component: SummaryPanel,
};
export default meta;

type Story = StoryObj<typeof SummaryPanel>;

export const WithFindings: Story = {
  args: { response, loadedAt },
};
export const WithSkippedChecks: Story = {
  args: { response: states.withSkipped.response!, loadedAt },
};
export const AllClear: Story = { args: { response: states.allClear.response!, loadedAt } };
