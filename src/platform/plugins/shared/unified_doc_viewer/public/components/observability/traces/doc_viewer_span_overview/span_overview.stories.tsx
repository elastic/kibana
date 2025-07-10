/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import type { Meta, StoryObj } from '@storybook/react';
import { mockUnifiedDocViewerServices } from '../../../../__mocks__';
import { setUnifiedDocViewerServices } from '../../../../plugin';
import minimalAPMFixture from './__fixtures__/apm/minimal.json';
import minimalOtelFixture from './__fixtures__/otel/minimal.json';
import { SpanOverview } from './span_overview';

const meta: Meta<typeof SpanOverview> = {
  component: SpanOverview,

  // We might be able to do this to allow pasting in spans
  //render: ({ hit, ...args }) => <SpanOverview hit={buildDataTableRecord(hit)} {...args} />,
};

export default meta;
type Story = StoryObj<typeof SpanOverview>;

const baseArgs = {
  hit: buildDataTableRecord({}),
  indexes: {
    apm: {
      traces: 'traces-*',
      errors: 'errors-*',
    },
    logs: 'logs-*',
  },
};

(
  mockUnifiedDocViewerServices.data.query.timefilter.timefilter.getAbsoluteTime as jest.Mock
).mockReturnValue({
  from: 0,
  to: 1,
});
(
  mockUnifiedDocViewerServices.data.query.timefilter.timefilter.getTime as jest.Mock
).mockReturnValue({
  from: 0,
  to: 1,
});
setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

// TODO: Mock the duration and trace
// (mockUnifiedDocViewerServices.core.http.post as jest.Mock).mockResolvedValue({});

export const MinimalApm: Story = {
  name: 'Minimal APM span',
  args: {
    ...baseArgs,
    dataView: {
      ...dataViewMockWithTimeField,
      fields: { getByName: () => null },
    } as never,
    hit: buildDataTableRecord(minimalAPMFixture),
  },
};

export const MinimalOtel: Story = {
  name: 'Minimal Otel span',
  args: {
    ...baseArgs,
    dataView: {
      ...dataViewMockWithTimeField,
      fields: { getByName: () => null },
    } as never,
    hit: buildDataTableRecord(minimalOtelFixture),
  },
};
