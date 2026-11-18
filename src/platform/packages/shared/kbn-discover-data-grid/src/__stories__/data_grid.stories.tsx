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
import { EuiButton, EuiLink, EuiSpacer } from '@elastic/eui';

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
    getValue: (row) => row.field,
    getTextValue: ({ value }) => value,
    renderCell: ({ value }) => value,
  }),
  columnHelper.accessor({
    id: 'value',
    header: 'Value',
    getValue: (row) => row.value,
    getTextValue: ({ value }) => value,
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

interface ConfigurableRow {
  id: string;
  values: readonly string[];
}

interface ConfigurableDataGridProps {
  rowCount: number;
  columnCount: number;
  height: number;
}

const MAX_CONFIGURABLE_ROWS = 10_000;
const MAX_CONFIGURABLE_COLUMNS = 20;
const configurableColumnHelper = createDataGridColumnHelper<ConfigurableRow>();
const getConfigurableRowId = (row: ConfigurableRow) => row.id;
const clampCount = (count: number, minimum: number, maximum: number): number =>
  Number.isFinite(count) ? Math.min(Math.max(Math.floor(count), minimum), maximum) : minimum;

const ConfigurableDataGrid = ({ rowCount, columnCount, height }: ConfigurableDataGridProps) => {
  const safeRowCount = clampCount(rowCount, 0, MAX_CONFIGURABLE_ROWS);
  const safeColumnCount = clampCount(columnCount, 1, MAX_CONFIGURABLE_COLUMNS);
  const configurableColumns = React.useMemo(
    () =>
      Array.from({ length: safeColumnCount }, (_columnValue, columnIndex) => {
        const columnNumber = columnIndex + 1;
        return configurableColumnHelper.accessor({
          id: `column-${columnNumber}`,
          header: `Column ${columnNumber}`,
          getValue: (row) => row.values[columnIndex] ?? '',
          getTextValue: ({ value }) => value,
          renderCell: ({ value }) => value,
        });
      }),
    [safeColumnCount]
  );
  const configurableRows = React.useMemo(
    () =>
      Array.from({ length: safeRowCount }, (_rowValue, rowIndex) => ({
        id: `row-${rowIndex + 1}`,
        values: Array.from(
          { length: safeColumnCount },
          (_cellValue, columnIndex) => `Row ${rowIndex + 1}, column ${columnIndex + 1}`
        ),
      })),
    [safeColumnCount, safeRowCount]
  );

  return (
    <DataGrid
      ariaLabel={`${safeRowCount} rows by ${safeColumnCount} columns`}
      columns={configurableColumns}
      rows={configurableRows}
      getRowId={getConfigurableRowId}
      viewport={{ mode: 'fixed', height }}
      virtualization={{ rows: { estimatedHeight: 40, overscan: 5 } }}
    />
  );
};

interface LinkRow {
  id: string;
  field: string;
  url: string;
}

const linkColumnHelper = createDataGridColumnHelper<LinkRow>();
const linkColumns = [
  linkColumnHelper.accessor({
    id: 'field',
    header: 'Field',
    getValue: (row) => row.field,
    getTextValue: ({ value }) => value,
    renderCell: ({ value }) => value,
  }),
  linkColumnHelper.accessor({
    id: 'url',
    header: 'Value',
    getValue: (row) => row.url,
    getTextValue: ({ value }) => value,
    renderCell: ({ value }) => (
      <EuiLink href={value} target="_blank">
        {value}
      </EuiLink>
    ),
  }),
];
const linkRows = Array.from({ length: 1_000 }, (_, index) => ({
  id: `row-${index}`,
  field: `url_${index}`,
  url: `https://www.elastic.co/?row=${index}`,
}));
const getLinkRowId = (row: LinkRow) => row.id;

const LinkDataGrid = ({ height }: { height: number }) => (
  <>
    <EuiButton size="s">Before grid</EuiButton>
    <EuiSpacer size="s" />
    <DataGrid
      ariaLabel="Fields with links"
      columns={linkColumns}
      rows={linkRows}
      getRowId={getLinkRowId}
      viewport={{ mode: 'fixed', height }}
    />
    <EuiSpacer size="s" />
    <EuiButton size="s">After grid</EuiButton>
  </>
);

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
    viewport: { mode: 'fixed', height: 480 },
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

export const FillsContainer: StoryObj<typeof meta> = {
  parameters: {
    docs: {
      description: {
        story:
          'With the default `fill` viewport, the grid takes the height of its container, which needs a height of its own, such as the 360px one in this story.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div css={{ blockSize: 360 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => <ExampleDataGrid {...args} viewport={{ mode: 'fill' }} />,
};

export const ConfigurableSize: StoryObj<typeof ConfigurableDataGrid> = {
  args: {
    rowCount: 1_000,
    columnCount: 5,
    height: 480,
  },
  argTypes: {
    rowCount: {
      control: { type: 'number', min: 0, max: MAX_CONFIGURABLE_ROWS, step: 1 },
      description: 'Number of logical rows in the grid.',
    },
    columnCount: {
      control: { type: 'number', min: 1, max: MAX_CONFIGURABLE_COLUMNS, step: 1 },
      description: 'Number of logical columns in the grid.',
    },
    height: {
      control: { type: 'range', min: 160, max: 800, step: 40 },
      description: 'Height of the contained grid viewport.',
    },
  },
  parameters: {
    controls: {
      include: ['rowCount', 'columnCount', 'height'],
    },
    docs: {
      description: {
        story:
          'Use the controls to change the logical row and column counts while retaining virtualization and stable logical identities.',
      },
    },
  },
  render: (args) => <ConfigurableDataGrid {...args} />,
};

export const InlineLinks: StoryObj<typeof LinkDataGrid> = {
  args: {
    height: 480,
  },
  argTypes: {
    height: {
      control: { type: 'range', min: 160, max: 800, step: 40 },
      description: 'Height of the contained grid viewport.',
    },
  },
  parameters: {
    controls: {
      include: ['height'],
    },
    docs: {
      description: {
        story:
          'Every value cell renders a live link. Tab and Shift+Tab enter the grid on its active cell and leave it without stopping on any link. Press Enter on a value cell to focus its link and Enter again to open it; Escape returns to the cell.',
      },
    },
  },
  render: (args) => <LinkDataGrid {...args} />,
};
