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
import minimalAPMFixture from '../../../../__fixtures__/span_apm_minimal.json';
import minimalOtelFixture from '../../../../__fixtures__/span_otel_minimal.json';
import httpServerApmFixture from '../../../../__fixtures__/transaction_http_server_apm.json';
import httpServerOtelFixture from '../../../../__fixtures__/transaction_http_server_otel.json';
import redisClientOtelFixture from '../../../../__fixtures__/span_otel_redis_client.json';
import { Overview, type OverviewProps } from './overview';

type Args = UnifiedDocViewerStorybookArgs<OverviewProps>;
const meta = {
  title: 'Trace Overview',
  component: Overview,
} satisfies Meta<typeof Overview>;

export default meta;
type Story = StoryObj<Args>;

/**
 * Simplest possible APM span.
 */
export const MinimalApm: Story = {
  name: 'Minimal APM span',
  args: {
    hit: minimalAPMFixture,
  },
  tags: ['apm', 'span'],
};

/**
 * Simplest possible OpenTelemetry span.
 */
export const MinimalOtel: Story = {
  name: 'Minimal Otel span',
  args: {
    hit: minimalOtelFixture,
  },
  tags: ['otel', 'span'],
};

/**
 * Redis client database span, processed by the elasticapmprocessor to add APM attributes.
 */
export const RedisClientOtel: Story = {
  name: 'Redis client span (processed Otel)',
  args: {
    hit: redisClientOtelFixture,
  },
  tags: ['otel', 'db', 'redis', 'client', 'span'],
};

/**
 * APM HTTP transaction
 */
export const ApmHttpServer: Story = {
  name: 'APM HTTP server transaction',
  args: {
    hit: httpServerApmFixture,
  },
  tags: ['transaction', 'span', 'http', 'server', 'apm'],
};

/**
 * OpenTelemetry HTTP server span.
 * Processed by the elasticapmprocessor to add APM transaction and span attributes.
 */
export const OtelHttpServer: Story = {
  name: 'OpenTelemetry HTTP server transaction',
  args: {
    hit: httpServerOtelFixture,
  },
  tags: ['otel', 'transaction', 'span', 'http', 'server', 'apm'],
};
