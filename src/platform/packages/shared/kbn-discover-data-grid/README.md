# `@kbn/discover-data-grid`

`@kbn/discover-data-grid` is an incubating, generic rendered-grid foundation. Discover owns its
initial development, but the package is deliberately free of Discover, document, data-view, query,
and plugin contracts so that it can later move to `@kbn/ui` without redesigning its public API.

The package currently provides:

- generic typed rows and opaque declarative columns;
- required stable row identity;
- a fixed header and contained vertical scroll owner;
- bounded row virtualization with dynamic measurement support;
- grid markup styled with EUI design tokens.

TanStack Table and TanStack Virtual are private implementation details. Consumers must not depend on
their table, row, column, cell, state, or virtualizer objects.

## Usage

```tsx
import { createDataGridColumnHelper, DataGrid } from '@kbn/discover-data-grid';

interface ResultRow {
  id: string;
  name: string;
  value: string;
}

const columnHelper = createDataGridColumnHelper<ResultRow>();
const columns = [
  columnHelper.accessor({
    id: 'name',
    header: 'Name',
    accessibilityLabel: 'Name',
    getValue: (row) => row.name,
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

const rows: ResultRow[] = [
  { id: 'host-name', name: 'host.name', value: 'example-host' },
];
const getRowId = (row: ResultRow) => row.id;

export const Results = () => (
  <DataGrid
    ariaLabel="Result fields"
    columns={columns}
    rows={rows}
    getRowId={getRowId}
    height={400}
    virtualization={{
      rows: {
        estimatedHeight: 40,
        overscan: 5,
      },
    }}
  />
);
```

Keep `rows`, `columns`, and `getRowId` stable between meaningful changes. Row IDs must be unique and
must continue to identify the same logical row when rows are inserted, removed, or reordered.
Row virtualization is enabled by default. Its estimated height and overscan can be tuned through
`virtualization.rows`; omitting those options uses the package defaults.

## Intentional initial limits

This foundation slice does not yet expose sorting, pagination, column resizing, density controls,
cell actions, cell details, editing, arbitrary pinning, external scroll ownership, or low-level body,
row, cell, table, and virtualizer escape hatches.
