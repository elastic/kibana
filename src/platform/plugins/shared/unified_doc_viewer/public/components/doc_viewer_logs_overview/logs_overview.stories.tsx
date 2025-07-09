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
import { mockUnifiedDocViewerServices } from '../../__mocks__';
import { setUnifiedDocViewerServices } from '../../plugin';
import otelExampleFixture from './__fixtures__/otel_example.json';
import { LogsOverview } from './logs_overview';

const meta: Meta<typeof LogsOverview> = {
  component: LogsOverview,
};

export default meta;
type Story = StoryObj<typeof LogsOverview>;

setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

const mockDataView = {
  ...dataViewMockWithTimeField,
  fields: { getAll: () => [], getByName: () => null },
} as never;

const baseArgs = {
  hit: {},
  dataView: mockDataView,
};

export const Minimal: Story = {
  args: {
    ...baseArgs,
    hit: buildDataTableRecord({ fields: { '@timestamp': new Date().toISOString() } }),
  },
};

export const OtelExample: Story = {
  args: {
    ...baseArgs,
    hit: buildDataTableRecord(otelExampleFixture),
  },
};
