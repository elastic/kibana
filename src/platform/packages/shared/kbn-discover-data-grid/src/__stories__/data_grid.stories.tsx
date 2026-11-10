/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { createDataGridColumnHelper, DataGrid, type DataGridProps } from '../..';

interface ExampleRow {
  id: string;
  field: string;
  value: string;
}

const columnHelper = createDataGridColumnHelper<ExampleRow>();
const columns = [
  columnHelper.accessor({
    id: 'field',
    header: 'Field',
    accessibilityLabel: 'Field',
    getValue: (row) => row.field,
    renderCell: ({ value }) => value,
  }),
  columnHelper.accessor({
    id: 'value',
    header: 'Value',
    accessibilityLabel: 'Value',
    getValue: (row) => row.value,
    renderCell: ({ value }) => value,
  }),
];
const rows = Array.from({ length: 1_000 }, (_, index) => ({
  id: `row-${index}`,
  field: `field_${index}`,
  value:
    index % 12 === 0
      ? 'A longer value that wraps onto multiple lines and exercises dynamic row measurement.'
      : `value_${index}`,
}));

type ExampleDataGridProps = DataGridProps<ExampleRow>;

const ExampleDataGrid = (props: ExampleDataGridProps) => <DataGrid {...props} />;

const meta = {
  title: 'Discover/Data grid/Foundation',
  component: ExampleDataGrid,
  parameters: {
    layout: 'padded',
  },
  args: {
    ariaLabel: 'Example fields',
    columns,
    rows,
    getRowId: (row) => row.id,
    height: 480,
    virtualization: {
      rows: {
        estimatedHeight: 40,
        overscan: 5,
      },
    },
  },
} satisfies Meta<typeof ExampleDataGrid>;

export default meta;

export const Default: StoryObj<typeof meta> = {};
