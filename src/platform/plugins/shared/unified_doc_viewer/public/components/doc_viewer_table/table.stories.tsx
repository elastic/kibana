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
  AT_TIMESTAMP,
  EVENT_OUTCOME,
  HOST_NAME,
  HTTP_RESPONSE_STATUS_CODE,
  PARENT_ID,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRACE_ID,
  TRANSACTION_ID,
} from '@kbn/apm-types';
import React from 'react';
import type { EuiDataGridCellPopoverElementProps } from '@elastic/eui';
import type { UnifiedDocViewerStorybookArgs } from '../../../.storybook/preview';
import type { DocViewerTableProps } from './table';
import { DocViewerTable } from './table';
import APMSpanFixture from '../../__fixtures__/span_apm.json';

type Args = UnifiedDocViewerStorybookArgs<DocViewerTableProps>;
const meta = {
  title: 'Doc viewers/Table',
  component: DocViewerTable,
} satisfies Meta<typeof DocViewerTable>;

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {
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

const fieldNames = [
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
];

const rows = fieldNames.map((fieldName) => ({
  name: fieldName,
  value: APMSpanFixture.fields[fieldName as keyof typeof APMSpanFixture.fields],
}));

export const Custom: Story = {
  args: {
    hit: APMSpanFixture,
    columns: [],
    columnsMeta: {},
    filter: () => {},
    onAddColumn: () => {},
    onRemoveColumn: () => {},
    textBasedHits: undefined,
    decreaseAvailableHeightBy: 0,
    availableFeatures: {
      dataGridHeader: false,
      pinColumn: false,
      hideNullValuesToggle: false,
      selectedOnlyToggle: false,
    },
    fieldNames,
    customRenderCellValue: ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      const row = rows[rowIndex];
      return <p>Custom cell content: {columnId === 'name' ? row.name : row.value}</p>;
    },
    customRenderCellPopover: ({
      columnId,
      cellActions,
      rowIndex,
    }: EuiDataGridCellPopoverElementProps) => {
      const row = rows[rowIndex];

      return (
        <>
          <p>Custom popover content: {columnId === 'name' ? row.name : row.value}</p>
          {cellActions}
        </>
      );
    },
  },
};
