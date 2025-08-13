/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import { UnifiedDocViewerStorybookArgs } from '../../../../.storybook/preview';
import APMSpanFixture from '../../../__fixtures__/span_apm.json';
import APMTransactionFixture from '../../../__fixtures__/transaction_apm.json';
import { ContentFrameworkTable, ContentFrameworkTableProps } from '.';
import { spanFields } from '../../observability/traces/doc_viewer_span_overview/resources/fields';
import { transactionFields } from '../../observability/traces/doc_viewer_transaction_overview/resources/fields';

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
    fieldNames: [...spanFields, 'span.name', 'span.id'],
    title: 'APM Span data',
  },
};

export const APMTransaction: Story = {
  name: 'APM Transaction',
  args: {
    hit: APMTransactionFixture,
    fieldNames: [...transactionFields, 'transaction.name', 'transaction.id'],
    title: 'APM Transaction data',
  },
};
