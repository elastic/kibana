/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { UnifiedDocViewerStorybookArgs } from '../../../../../.storybook/preview';
import genericDocument from '../../../../__fixtures__/generic_document.json';
import { Overview, type OverviewProps } from './overview';

type Args = UnifiedDocViewerStorybookArgs<OverviewProps>;
const meta = {
  title: 'Generic Overview',
  component: Overview,
} satisfies Meta<typeof Overview>;

export default meta;
type Story = StoryObj<Args>;

/**
 * An example generic document
 */
export const MinimalGeneric: Story = {
  name: 'Minimal Generic Document',
  args: {
    hit: genericDocument,
  },
  tags: ['generic', 'span'],
};
