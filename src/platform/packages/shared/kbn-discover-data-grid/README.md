# `@kbn/discover-data-grid`

`@kbn/discover-data-grid` is an incubating, generic rendered-grid foundation. Discover owns its
initial development, but the package is deliberately free of Discover, document, data-view, query,
and plugin contracts so that it can later move to `@kbn/ui` without redesigning its public API.

The package currently provides:

- generic typed rows and opaque declarative columns;
- required stable row identity;
- a fixed header and contained vertical scroll owner;
- bounded row virtualization with dynamic measurement support;
- grid markup styled with EUI design tokens;
- stable logical cell focus, a single composite tab stop, and baseline grid keyboard navigation;
- semantic focus and scroll commands addressed by row and column ID.

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
    getValue: (row) => row.name,
    getAccessibilityValue: ({ value }) => value,
    renderCell: ({ value }) => value,
  }),
  columnHelper.accessor({
    id: 'value',
    header: 'Value',
    getValue: (row) => row.value,
    getAccessibilityValue: ({ value }) => value,
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
Text headers provide their own accessible name. Set a column's optional `ariaLabel` only when its
rendered header needs a different accessible name, such as an icon-only or abbreviated header.
Row virtualization is enabled by default. Its estimated height and overscan can be tuned through
`virtualization.rows`; omitting those options uses the package defaults.

Each column must provide a `getAccessibilityValue` callback. It is the semantic and clipboard value
for a cell and is deliberately separate from `renderCell`, so visual React content never has to be
inspected or converted back into text. Phase 1 `renderCell` output is read-only visual content and
must not include tabbable descendants such as links, buttons, or inputs. Interactive controls and
complex cell content will be introduced through public capabilities that preserve the grid's
composite tab stop without inspecting or rewriting consumer DOM.

## Keyboard and focus behavior

The first body cell is the initial tab stop. The last surviving logical cell is restored on later
entry, and an empty grid uses the named grid itself as its tab stop. Static headers are semantic but
are not part of the keyboard navigation plane.

- Arrow keys move one cell without wrapping.
- Home and End move to the first and last cell in the current row.
- Ctrl/Cmd+Home and Ctrl/Cmd+End move to the first and last body cell.
- Cmd+C on macOS and Ctrl+C elsewhere copy the column-provided accessibility value unless the user
  has an explicit text selection.

Consumers that need semantic control can pass `apiRef` and call `focusCell` or `scrollToCell` with a
stable `{ rowId, columnId }` address. Commands return explicit completed, failed, or cancelled
results; they never fall back to an unrelated cell when an address is missing, and scrolling
failures preserve the current active cell and focus.

## Intentional initial limits

This foundation slice does not yet expose sorting, pagination, column resizing, density controls,
cell actions, cell details, editing, arbitrary pinning, external scroll ownership, or low-level body,
row, cell, table, and virtualizer escape hatches.
