/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { UnifiedDocViewerStorybookArgs } from '../../../.storybook/preview';
import { DocViewerTable } from './table';
import APMSpanFixture from '../../__fixtures__/span_apm.json';

type Args = UnifiedDocViewerStorybookArgs<DocViewRenderProps>;
const meta = {
  title: 'Doc viewers/Table',
  component: DocViewerTable,
} satisfies Meta<typeof DocViewerTable>;

export default meta;
type Story = StoryObj<Args>;

export const Basic: Story = {
  args: {
    hit: APMSpanFixture,
    columns: [],
    columnsMeta: {},
    filter: () => {},
    onAddColumn: () => {},
    onRemoveColumn: () => {},
    textBasedHits: undefined,
    decreaseAvailableHeightBy: 0,
  },
};

export const TanStackGrid: Story = {
  args: {
    ...Basic.args,
    gridImplementation: 'tanstack',
  },
};

const MANY_FIELDS_COUNT = 2000;
const manyFieldsHit = {
  _index: 'many-fields',
  _id: 'many-fields',
  _source: Object.fromEntries(
    Array.from({ length: MANY_FIELDS_COUNT }, (_, i) => [
      `field_${String(i).padStart(4, '0')}`,
      i % 5 === 0 ? `A longer value for field ${i} `.repeat(8) : `value ${i}`,
    ])
  ),
};

export const ManyFields: Story = {
  args: {
    ...Basic.args,
    hit: manyFieldsHit,
  },
};

export const TanStackGridManyFields: Story = {
  args: {
    ...ManyFields.args,
    gridImplementation: 'tanstack',
  },
};
