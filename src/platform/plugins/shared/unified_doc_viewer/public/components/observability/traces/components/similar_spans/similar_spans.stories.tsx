/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { UnifiedDocViewerStorybookArgs } from '../../../../../../.storybook/preview';
import APMSpanFixture from '../../../../../__fixtures__/span_apm_minimal.json';

import type { SimilarSpansProps } from '.';
import { SimilarSpans } from '.';

const mockSpanDistributionChartData = [
  {
    id: 'All spans',
    histogram: [
      { key: 100, doc_count: 2 },
      { key: 500, doc_count: 5 },
      { key: 1200, doc_count: 1 },
    ],
    areaSeriesColor: '#54B399',
  },
];
const meta = {
  title: 'Observability/Traces/Similar Spans',
  component: SimilarSpans,
} satisfies Meta<typeof SimilarSpans>;

type Args = UnifiedDocViewerStorybookArgs<SimilarSpansProps>;
// TODO remove the hit from here, not all components on this plugin need a hit

export default meta;
type Story = StoryObj<Args>;

export const Basic: Story = {
  args: {
    hit: APMSpanFixture,
    spanDuration: 1200,
    latencyChart: {
      data: {
        distributionChartData: mockSpanDistributionChartData,
        percentileThresholdValue: 1000,
      },
      loading: false,
      hasError: false,
    },
    isOtelSpan: true,
    esqlQuery: 'test',
  },
};

export const Loading: Story = {
  args: {
    hit: APMSpanFixture,
    spanDuration: 1200,
    latencyChart: {
      data: null,
      loading: true,
      hasError: false,
    },
    isOtelSpan: false,
    esqlQuery: 'test',
  },
};

export const Error: Story = {
  args: {
    hit: APMSpanFixture,
    spanDuration: 1200,
    latencyChart: {
      data: {
        distributionChartData: [],
      },
      loading: false,
      hasError: true,
    },
    isOtelSpan: false,
    esqlQuery: 'test',
  },
};
