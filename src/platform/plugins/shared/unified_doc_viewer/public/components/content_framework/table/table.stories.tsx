/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  AGENT_NAME,
  AGENT_VERSION,
  AT_TIMESTAMP,
  DURATION,
  EVENT_OUTCOME,
  HOST_NAME,
  HTTP_RESPONSE_STATUS_CODE,
  KIND,
  PARENT_ID,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
} from '@kbn/apm-types';
import React from 'react';
import type { UnifiedDocViewerStorybookArgs } from '../../../../.storybook/preview';
import APMSpanFixture from '../../../__fixtures__/span_apm.json';
import APMTransactionFixture from '../../../__fixtures__/transaction_apm.json';
import SpanOtelRedisClientFixture from '../../../__fixtures__/span_otel_redis_client.json';
import type { ContentFrameworkTableProps } from '.';
import { ContentFrameworkTable } from '.';

type Args = UnifiedDocViewerStorybookArgs<ContentFrameworkTableProps>;
const meta = {
  title: 'Content Framework/Table',
  component: ContentFrameworkTable,
} satisfies Meta<typeof ContentFrameworkTable>;

export default meta;
type Story = StoryObj<Args>;

export const APMSpan: Story = {
  name: 'APM Span',
  args: {
    hit: APMSpanFixture,
    fieldNames: [
      AT_TIMESTAMP,
      SERVICE_NAME,
      SPAN_DESTINATION_SERVICE_RESOURCE,
      HTTP_RESPONSE_STATUS_CODE,
      SPAN_TYPE,
      SPAN_SUBTYPE,
      EVENT_OUTCOME,
      TRANSACTION_ID,
      SPAN_DURATION,
      HOST_NAME,
      SERVICE_NODE_NAME,
      TRACE_ID,
      PARENT_ID,
      TRANSACTION_ID,
    ],
    id: 'APM Span data',
    fieldConfigurations: {
      [SPAN_DURATION]: {
        title: 'Duration',
        description: 'Custom field description',
        formatter: (value) => <div>Custom formatter for: {value}</div>,
      },
      [EVENT_OUTCOME]: {
        title: 'Outcome',
        description: 'Custom field description',
        formatter: (value) => (
          <div>
            Custom formatter with highlight: <mark className="ffSearch__highlight">{value}</mark>
          </div>
        ),
      },
    },
  },
};

export const APMTransaction: Story = {
  name: 'APM Transaction',
  args: {
    hit: APMTransactionFixture,
    fieldNames: [
      AT_TIMESTAMP,
      SERVICE_NAME,
      TRANSACTION_NAME,
      HTTP_RESPONSE_STATUS_CODE,
      EVENT_OUTCOME,
      TRANSACTION_ID,
      TRANSACTION_DURATION,
      HOST_NAME,
      SERVICE_NODE_NAME,
      TRACE_ID,
      PARENT_ID,
      TRANSACTION_ID,
      AGENT_NAME,
      AGENT_VERSION,
    ],
    id: 'APM Transaction data',
    fieldConfigurations: {
      [TRANSACTION_DURATION]: {
        title: 'Duration',
        description: 'Custom field description',
        formatter: (value) => <div>Custom formatter for: {value}</div>,
      },
      [EVENT_OUTCOME]: {
        title: 'Outcome',
        description: 'Custom field description',
        formatter: (value) => (
          <div>
            Custom formatter with highlight: <mark className="ffSearch__highlight">{value}</mark>
          </div>
        ),
      },
    },
  },
};
export const SpanOtelRedisClient: Story = {
  name: 'Span Otel Redis Client',
  args: {
    hit: SpanOtelRedisClientFixture,
    fieldNames: [AT_TIMESTAMP, SERVICE_NAME, 'db.system', 'db.statement', DURATION, KIND],
    id: 'APM Transaction data',
    fieldConfigurations: {
      [DURATION]: {
        title: 'Duration',
        description: 'Custom field description',
        formatter: (value) => <div>Custom formatter for: {value}</div>,
      },
      ['db.system']: {
        title: 'Database',
        description: 'Custom field description',
        formatter: (value) => (
          <div>
            Custom formatter with highlight: <mark className="ffSearch__highlight">{value}</mark>
          </div>
        ),
      },
    },
  },
};
