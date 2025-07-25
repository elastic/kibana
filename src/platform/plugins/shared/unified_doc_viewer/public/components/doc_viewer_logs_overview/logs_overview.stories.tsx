/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { UnifiedDocViewerStorybookArgs } from '../../../.storybook/preview';
import errorApmOtelFixture from '../../__fixtures__/error_apm_otel.json';
import otelExampleFixture from '../../__fixtures__/logs_otel_example.json';
import { LogsOverview, type LogsOverviewProps } from './logs_overview';

type Args = UnifiedDocViewerStorybookArgs<LogsOverviewProps>;
const meta = {
  title: 'Logs overview',
  component: LogsOverview,
} satisfies Meta<typeof LogsOverview>;
export default meta;
type Story = StoryObj<Args>;

export const Minimal: Story = {
  name: 'Minimal log',
  args: {
    hit: { fields: { '@timestamp': new Date().toISOString() } },
  },
};

export const OtelExample: Story = {
  name: 'Otel example log',
  args: {
    hit: otelExampleFixture,
  },
};

export const ApmErrorOtelExample: Story = {
  name: 'APM Error (processed Otel)',
  args: {
    hit: errorApmOtelFixture,
  },
};
