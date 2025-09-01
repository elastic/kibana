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
import httpServerApmFixture from '../../../../__fixtures__/transaction_http_server_apm.json';
import httpServerOtelFixture from '../../../../__fixtures__/transaction_http_server_otel.json';
import { TransactionOverview, type TransactionOverviewProps } from './transaction_overview';

type Args = UnifiedDocViewerStorybookArgs<TransactionOverviewProps>;
const meta = {
  title: 'Transaction overview',
  component: TransactionOverview,
} satisfies Meta<TransactionOverviewProps>;
export default meta;

type Story = StoryObj<Args>;

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
