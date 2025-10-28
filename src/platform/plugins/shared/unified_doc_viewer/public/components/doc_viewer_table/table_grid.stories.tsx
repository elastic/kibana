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
} from '@kbn/apm-types';
import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EuiDataGridCellPopoverElementProps } from '@elastic/eui';
import React from 'react';
import type { UnifiedDocViewerStorybookArgs } from '../../../.storybook/preview';
import type { TableGridProps } from './table_grid';
import { TableGrid, GRID_COLUMN_FIELD_NAME, GRID_COLUMN_FIELD_VALUE } from './table_grid';
import APMSpanFixture from '../../__fixtures__/span_apm.json';
import { FieldRow } from './field_row';

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

const hit = buildDataTableRecord(APMSpanFixture);

const rows: FieldRow[] = fieldNames.map((fieldName) => {
  return new FieldRow({
    name: fieldName,
    displayNameOverride: fieldName,
    flattenedValue: APMSpanFixture.fields[fieldName as keyof typeof APMSpanFixture.fields],
    hit,
    dataView: buildDataViewMock({
      name: 'apm-span-data-view',
      fields: undefined,
    }),
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    isPinned: false,
    columnsMeta: {},
  });
});

type Args = UnifiedDocViewerStorybookArgs<TableGridProps>;
const meta = {
  title: 'Doc viewers/Table/Table Grid',
  component: TableGrid,
} satisfies Meta<typeof TableGrid>;

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {
  args: {
    id: 'custom-table-story',
    hit: APMSpanFixture,
    containerWidth: 800,
    rows,
    isEsqlMode: false,
    filter: () => {},
    onAddColumn: () => {},
    onRemoveColumn: () => {},
    columns: [GRID_COLUMN_FIELD_NAME, GRID_COLUMN_FIELD_VALUE],
  },
};

export const CustomRenderers: Story = {
  args: {
    id: 'custom-table-story',
    hit: APMSpanFixture,
    containerWidth: 800,
    rows,
    isEsqlMode: false,
    filter: () => {},
    onAddColumn: () => {},
    onRemoveColumn: () => {},
    columns: [GRID_COLUMN_FIELD_NAME, GRID_COLUMN_FIELD_VALUE],
    initialPageSize: 25,
    pinnedFields: [],
    hidePinColumn: false,
    customRenderCellValue: ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      const row = rows[rowIndex];
      return (
        <p>
          Custom cell content: {columnId === 'name' ? String(row.name) : String(row.flattenedValue)}
        </p>
      );
    },
    customRenderCellPopover: ({
      columnId,
      cellActions,
      rowIndex,
    }: EuiDataGridCellPopoverElementProps) => {
      const row = rows[rowIndex];

      return (
        <>
          <p>
            Custom popover content:{' '}
            {columnId === 'name' ? String(row.name) : String(row.flattenedValue)}
          </p>
          {cellActions}
        </>
      );
    },
  },
};
