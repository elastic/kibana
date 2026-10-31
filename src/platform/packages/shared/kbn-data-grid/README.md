# @kbn/data-grid

A generic, virtualized data grid built on TanStack Table and TanStack Virtual. It has no knowledge of
documents or data views: columns describe how to render a row, so any tabular UI can use it.

It provides cells, cell actions, the cell expansion popover, keyboard navigation (single tab stop with
arrow, Home and End keys), ARIA grid semantics, EUI theming, auto row heights and sticky pinned rows.

Today it is used by the Doc Viewer fields table, behind the `discover.kbnDataGridEnabled` feature flag.

> **Experimental.** The API may still change until a second consumer (e.g. `@kbn/unified-data-table`)
> uses it.

## Usage

```tsx
import { DataGrid, type DataGridColumn } from '@kbn/data-grid';

interface Row {
  id: string;
  name: string;
}

const columns: Array<DataGridColumn<Row>> = [
  { id: 'name', header: 'Name', initialWidth: 200, isResizable: true, renderCell: ({ row }) => row.name },
  { id: 'id', header: 'Id', cellActions, renderCell: ({ row }) => row.id },
];

<DataGrid rows={rows} columns={columns} getRowId={(row) => row.id} ariaLabel="Results" />;
```

Memoize `columns`: a new array rebuilds the column model. `renderCell` may close over props, the
visible cells re-render when it changes.

## `DataGrid` props

| Prop | Description |
|---|---|
| `rows`, `getRowId` | The data, and a stable string id per row. |
| `columns` | `DataGridColumn[]`, see below. |
| `leadingControlColumns`, `trailingControlColumns` | `DataGridControlColumn[]` rendered before and after the data columns: `{ id, header, width, renderCell({ row, rowIndex }), cellCss? }`. For columns with their own interactive content, e.g. a pin button. They have no cell actions or popover, and keyboard focus skips them at first. Their content is not in the tab order: Enter or F2 on the cell moves focus into it, Escape moves it back to the cell. |
| `getCellProps({ row, rowIndex, columnId })` | Returns `{ css?, className?, 'data-test-subj'? }` for a cell, e.g. a background color. Keep it stable (`useCallback`). |
| `getRowProps({ row, rowIndex })` | Same, for a row, e.g. to highlight it. Keep it stable. |
| `columnWidths`, `onColumnResize({ columnId, width })` | Column widths by id. When `columnWidths` is set the grid is controlled: a resize only sticks if you update it in `onColumnResize`, which is called when the drag ends (with the width clamped to `minWidth`/`maxWidth`) or a double click resets the column (with `width: undefined`: remove the column from `columnWidths`). Without it the grid keeps the widths itself. |
| `ariaLabel` | Accessible name of the grid. Required. |
| `data-test-subj` | Defaults to `kbnDataGrid`. The pinned section uses `<subj>-pinnedRows`. |
| `pinnedRowIds` | Rows kept in a sticky section below the header, in `rows` order. |
| `showHeader` | Render the header row. Defaults to `true`. |
| `estimatedRowHeight` | Sizes the scrollbar before rows are measured. Rows grow to fit their content. |
| `initialScrollOffset`, `onScrollOffsetChange` | Restore and observe the vertical scroll position. |
| `gridRef` | Ref to `{ scrollToRow(rowId) }`. Only scrolls rows that are not pinned. |

## `DataGridColumn` options

| Option | Description |
|---|---|
| `id`, `header` | Column id, and header content. |
| `renderCell({ row, rowIndex, columnId, isDetails })` | Renders the cell. `rowIndex` is the index of the row in the `rows` you passed (not its pinned or scrolled position). `isDetails` is `true` inside the expansion popover. |
| `initialWidth`, `minWidth`, `maxWidth` | `initialWidth` is a number of pixels, or a function of the grid width, used until the user resizes the column. Columns without one share the remaining space. |
| `isResizable` | Allow resizing from the header edge. Needs an `initialWidth`. |
| `cellActions` | `EuiDataGridColumnCellAction[]`, shown in the hover/focus bubble and in the popover footer. |
| `renderCellExpansionFooter(row)` | Extra content at the bottom of the popover, e.g. a warning. |
| `cellCss` | Emotion styles for every cell of the column, applied after the default cell styles. |

`DATA_GRID_REVEAL_ON_ROW_HOVER_CLASS` hides an element until its row is hovered or one of its cells has
focus. Prefer it over styling the grid's internal DOM.

## Not supported yet

Sorting, pagination, the column header menu, a footer row, density and row
height settings, column visibility and reordering, a custom popover body, a non-interactive mode and a
render-complete signal, horizontal scrolling and column virtualization, PageUp/PageDown, keyboard
column resizing, and an imperative API to focus a cell or open its popover. The API is not a drop-in replacement for `EuiDataGrid`.

## Using it in other components

The grid is meant to sit under feature-specific tables, which supply the columns and keep their own
data logic:

- **Tables that show something other than documents** (e.g. the Lens Table): map your data to rows and
  columns and render `DataGrid` directly.
- **Document tables** (`@kbn/unified-data-table`): data views, the document flyout, comparison,
  in-table search, loading more rows and profile extensions should stay in that package and build on
  `DataGrid`, rather than moving into this one.
- **Migrating an `EuiDataGrid`**: cell action components can be reused as they are. `renderCellValue`
  becomes a per-column `renderCell` that receives the row, and `leadingControlColumns` and
  `trailingControlColumns` map to the props of the same name, `setCellProps` to `getCellProps`, and
  `onColumnResize` and the widths to `onColumnResize` and `columnWidths`.

Keep this package free of Discover, data view and document concepts. If a feature needs a new
extension point, add a generic option to the column or grid props and implement the feature-specific
part in the consumer, as the Doc Viewer does for pinning, field filters and search highlighting.
