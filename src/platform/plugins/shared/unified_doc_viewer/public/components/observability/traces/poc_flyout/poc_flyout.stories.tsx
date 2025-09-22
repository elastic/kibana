/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import spanApmMinimalFixture from '../../../../__fixtures__/span_apm_minimal.json';
import type { UnifiedDocViewerStorybookArgs } from '../../../../../.storybook/preview';
import type { POCFlyoutProps } from '.';
import { POCFlyout } from '.';

type Args = UnifiedDocViewerStorybookArgs<POCFlyoutProps>;
const meta = {
  title: 'POC flyout',
  component: POCFlyout,
} satisfies Meta<typeof POCFlyout>;
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {
  name: 'Default',
  args: {
    hit: spanApmMinimalFixture,
  },
};
