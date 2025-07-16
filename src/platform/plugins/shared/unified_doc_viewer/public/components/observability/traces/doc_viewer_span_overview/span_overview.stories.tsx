/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord } from '@kbn/discover-utils';
import type { Meta, StoryObj } from '@storybook/react';
import minimalAPMFixture from './__fixtures__/apm/minimal.json';
import minimalOtelFixture from './__fixtures__/otel/minimal.json';
import redisClientOtelFixture from './__fixtures__/otel/redis_client_processed.json';
import { SpanOverview } from './span_overview';

const meta = {
  title: 'Span overview',
  component: SpanOverview,
} satisfies Meta<typeof SpanOverview>;

export default meta;
type Story = StoryObj<typeof SpanOverview>;

export const MinimalApm: Story = {
  name: 'Minimal APM span',
  args: {
    hit: buildDataTableRecord(minimalAPMFixture),
  },
};

export const MinimalOtel: Story = {
  name: 'Minimal Otel span',
  args: {
    hit: buildDataTableRecord(minimalOtelFixture),
  },
};

export const RedisClientOtel: Story = {
  name: 'Redis client span (processed Otel)',
  args: {
    hit: buildDataTableRecord(redisClientOtelFixture),
  },
};
