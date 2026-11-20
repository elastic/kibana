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
    viewport={{ mode: 'fixed', height: 400 }}
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
The `viewport` option decides how the grid's scroll viewport gets its height. By default
(`{ mode: 'fill' }`) the grid fills its container, which needs a height of its own, such as a flex
item with a defined size. It is never taller than the screen, even in a taller container, so the
number of mounted rows stays bounded when the container has no height. Use
`{ mode: 'fixed', height }` for a fixed height in pixels, which can be taller than the screen.
The grid does not measure its container: the browser sizes the viewport and the virtualizer observes
it.
Pass `data-test-subj` to give the grid element, the element with the `grid` role, a test subject.
Tests should not rely on any other element the grid renders.
Row virtualization is enabled by default. Its estimated height and overscan can be tuned through
`virtualization.rows`; omitting those options uses the package defaults.

Each column must provide a `getTextValue` callback. It returns the canonical plain-text cell value
copied from a focused cell when there is no text selection. It should match the visible data
semantically and is deliberately separate from `renderCell`, so visual React content never has to be
inspected or converted back into text.

Cells take their accessible name from their rendered content, so links, images, and other semantics
in `renderCell` output stay exposed to assistive technology. Content without visible text, such as an
icon, must provide its own accessible name.

## Keyboard and focus behavior

The first body cell is the initial tab stop. The last surviving logical cell is restored on later
entry, and an empty grid uses the named grid itself as its tab stop. Static headers are semantic but
are not part of the keyboard navigation plane.

The active cell's row stays rendered while it is scrolled out of view, so focus, including focus
inside the cell's content, survives scrolling. Keys keep working from there, and arrow keys scroll
their destination into view. When rows are reordered, focus stays on the same logical row and the
viewport does not move.

- Arrow keys move one cell without wrapping.
- Home and End move to the first and last cell in the current row.
- Ctrl/Cmd+Home and Ctrl/Cmd+End move to the first and last body cell.
- Enter moves focus to the first focusable element in the active cell's content.
  Cells without focusable content ignore Enter. Cells with focusable content tell screen readers
  to press Enter, and entering announces that Escape returns to the cell.
- While focus is inside a cell's content, Tab and Shift+Tab wrap among that cell's focusable
  elements, and Escape returns focus to the cell. The grid looks these elements up when the cell
  receives focus or a key needs them, and never rewrites their `tabindex`.
- The browser's copy command copies the column-provided text value unless the user has an explicit
  text selection. Multi-cell text selections are copied as tab-separated columns and
  newline-separated rows, matching EUIDataGrid.

The grid stays a single Tab stop even when read-only cell content contains incidental focusables,
such as links rendered by a field formatter. Those elements are never Tab stops: keyboard users reach
them with Enter, and they stay clickable and reachable through screen-reader link navigation.

- Visually hidden focus guards before and after the grid catch Tab and Shift+Tab entry and move focus
  to the logical active cell, scrolling to it if it is out of view.
- Tab and Shift+Tab from a cell, or from an empty grid, hand focus to the matching guard, and the
  browser's default Tab continues from there, past the grid.

Consumers that need semantic control can pass `apiRef` and call `focusCell` or `scrollToCell` with a
stable `{ rowId, columnId }` address. Commands return explicit completed, failed, or cancelled
results; they never fall back to an unrelated cell when an address is missing, and scrolling
failures preserve the current active cell and focus.

## Testing

JSDOM has no layout, so a grid rendered in Jest sees an empty viewport and mounts no rows, and the
focusable content of its cells looks hidden, so Enter cannot move into it. Call `mockDataGridLayout`
from `@kbn/discover-data-grid/mocks` before rendering to give every grid a viewport, fixed row
heights, and displayed cell content, so that its rows virtualize and its cells' focusable content is
found as they would be in a browser. Elements outside a grid keep JSDOM's behavior. It returns a
function that restores JSDOM's layout.

```tsx
import { mockDataGridLayout } from '@kbn/discover-data-grid/mocks';

let restoreLayout: () => void;
beforeEach(() => {
  restoreLayout = mockDataGridLayout({ viewportHeight: 400, rowHeight: 34 });
});
afterEach(() => restoreLayout());
```

Use it instead of mocking the grid's virtualizer or focus libraries, or stubbing DOM measurements
yourself.

## Intentional initial limits

This foundation slice does not yet expose sorting, pagination, column resizing, density controls,
cell actions, cell details, editing, arbitrary pinning, external scroll ownership, or low-level body,
row, cell, table, and virtualizer escape hatches.
