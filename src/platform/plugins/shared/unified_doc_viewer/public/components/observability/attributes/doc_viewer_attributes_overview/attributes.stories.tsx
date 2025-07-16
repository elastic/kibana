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
import AttributesOverview from '.';
import basicFixture from './__fixtures__/basic.json';
import redisSpanFixture from './__fixtures__/redis_span.json';

const meta: Meta<typeof AttributesOverview> = {
  title: 'Attributes',
  component: AttributesOverview,
};

export default meta;
type Story = StoryObj<typeof AttributesOverview>;

export const Basic: Story = { args: { hit: buildDataTableRecord(basicFixture) } };

export const RedisSpan: Story = {
  name: 'Redis client span (processed)',
  args: { hit: buildDataTableRecord(redisSpanFixture) },
};
