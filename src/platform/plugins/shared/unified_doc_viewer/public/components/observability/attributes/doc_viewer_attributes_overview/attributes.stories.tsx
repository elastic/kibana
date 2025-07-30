/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { expect } from 'storybook/test';
import AttributesOverview from '.';
import type { UnifiedDocViewerStorybookArgs } from '../../../../../.storybook/preview';
import basicFixture from '../../../../__fixtures__/span_otel_minimal.json';
import redisSpanFixture from '../../../../__fixtures__/span_otel_redis_client.json';

type Args = UnifiedDocViewerStorybookArgs<React.ComponentProps<typeof AttributesOverview>>;
const meta: Meta<typeof AttributesOverview> = {
  title: 'Attributes',
  component: AttributesOverview,
};
export default meta;
type Story = StoryObj<Args>;

export const Basic: Story = { args: { hit: basicFixture } };

export const RedisSpan: Story = {
  name: 'Redis client span (processed)',
  args: { hit: redisSpanFixture },
  /**
   * Check if both "server.port" and "server.address" are visible.
   * Search for "port" then check if "server.port" is visible and "server.address" is not.
   * Clear the input.
   */
  play: async ({ canvas, userEvent, step }) => {
    const searchInput = canvas.getByPlaceholderText('Search attributes names or values');
    await step('Check initial visibility', async () => {
      await expect(canvas.getByText('server.port')).toBeInTheDocument();
      await expect(canvas.getByText('server.address')).toBeInTheDocument();
    });
    await step('Enter "port" in the search box', async () => {
      await userEvent.clear(searchInput);
      await userEvent.type(searchInput, 'port');
    });
    await step('Check visibility after search', async () => {
      await expect(canvas.getByText('server.port')).toBeInTheDocument();
      await expect(canvas.queryByText('server.address')).not.toBeInTheDocument();
    });
    await step('Clear the search input', async () => {
      await userEvent.clear(searchInput);
    });
  },
};
