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
import AttributesOverview from '.';
import basicFixture from './__fixtures__/basic.json';
import redisSpanFixture from './__fixtures__/redis_span.json';
import { mockUnifiedDocViewerServices } from '../../../../__mocks__';
import { setUnifiedDocViewerServices } from '../../../../plugin';

const meta: Meta<typeof AttributesOverview> = {
  title: 'Attributes',
  component: AttributesOverview,
};

export default meta;
type Story = StoryObj<typeof AttributesOverview>;

setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

const mockDataView = {
  ...dataViewMockWithTimeField,
  fields: { getAll: () => [], getByName: () => null },
} as never;

const baseArgs = {
  hit: {},
  dataView: mockDataView,
};

export const Basic: Story = { args: { ...baseArgs, hit: buildDataTableRecord(basicFixture) } };

export const RedisSpan: Story = {
  name: 'Redis client span (processed)',
  args: { ...baseArgs, hit: buildDataTableRecord(redisSpanFixture) },
};
