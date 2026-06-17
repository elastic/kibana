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
