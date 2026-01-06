/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import type { UnifiedDocViewerStorybookArgs } from '../../../../.storybook/preview';
import { ContentFrameworkChart, type ContentFrameworkChartProps } from '.';
import APMSpanFixture from '../../../__fixtures__/span_apm_minimal.json';

type Args = UnifiedDocViewerStorybookArgs<ContentFrameworkChartProps>;
const meta = {
  title: 'Content Framework/Chart',
  component: ContentFrameworkChart,
} satisfies Meta<typeof ContentFrameworkChart>;

export default meta;
type Story = StoryObj<Args>;

export const Basic: Story = {
  args: {
    hit: APMSpanFixture,
    'data-test-subj': 'id',
    title: 'Chart Title',
    description: 'This is a description for the chart.',
    esqlQuery: 'test',
    children: <div>Chart content goes here.</div>,
  },
};
