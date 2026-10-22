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
| `leadingControlColumns`, `trailingControlColumns` | `DataGridControlColumn[]` before and after the data columns: `{ id, header, width, renderCell({ row, rowIndex, columnId, colIndex, setCellProps }), cellCss? }`. For columns with their own interactive content, e.g. a pin button or a checkbox. They are sticky, have no cell actions or popover, and keyboard focus skips them at first. |
| `ariaLabel`, `ariaLabelledBy`, `ariaDescribedBy`, `id`, `className`, `data-test-subj` | Accessible name and attributes of the grid. The pinned section uses `<subj>-pinnedRows`. |
| `getCellProps({ row, rowIndex, columnId })`, `getRowProps({ row, rowIndex })` | Return `{ css?, className?, 'data-test-subj'? }` for a cell or a row, e.g. a background color. Keep them stable (`useCallback`). |
| `sorting` | `{ columns: [{ id, direction }], onSort }`. Shows the sort indicator of the columns and the sort actions of the `isSortable` ones. |
| `onMoveColumn`, `onHideColumn` | Enable the "Move left", "Move right" and "Hide column" actions of the column headers. |
| `onReorderColumn({ columnId, toIndex })` | Enables reordering the data columns by dragging their headers (with a mouse or pen). `toIndex` is the column's position among the data columns after the move. The columns scroll while the pointer is near their edges, Escape cancels. Keyboard users move columns with the header actions. |
| `showHeader`, `headerRowHeight` | Render the header row, and how many lines of text it shows (`'auto'` grows). |
| `gridStyle` | `{ cellPadding, fontSize, border, stripes, rowHover, header }`, like `EuiDataGrid`. Defaults to compact text, horizontal borders, stripes and a hover highlight. |
| `rowHeight`, `lineHeight` | `'auto'`, or `{ lineCount }` lines of text per row, and the CSS line height of the text. |
| `pinnedRowIds` | Rows kept in a sticky section below the header, in `rows` order. |
| `estimatedRowHeight`, `overscan` | Sizing of the scrollbar before rows are measured, and rows rendered beyond the visible ones. |
| `columnWidths`, `onColumnResize({ columnId, width })` | Column widths by id. When `columnWidths` is set the grid is controlled: a resize only sticks if you update it in `onColumnResize`, which is called when the drag ends, with `width: undefined` when a column is reset. Without it the grid keeps the widths itself. |
| `initialScrollOffset`, `onScrollOffsetChange`, `onScroll` | Restore and observe the scroll position. `onScroll` also gets the size of the grid, e.g. to load more rows near the end. |
| `renderCellPopover` | Customizes the popover of an expanded cell. |
| `gridRef` | Ref to `{ scrollToRow, scrollToItem, setFocusedCell, openCellPopover, closeCellPopover }`. |

The grid scrolls horizontally when its columns need more room than it has. Columns without an
`initialWidth` share the remaining space, but never get narrower than 100px. Only the columns in view
are rendered, the control columns are always rendered and stay in view.

## `DataGridColumn` options

| Option | Description |
|---|---|
| `id`, `header`, `displayAsText` | Column id, header content, and its plain text name (e.g. for the header menu). |
| `renderCell({ row, rowIndex, columnId, colIndex, isDetails, setCellProps, isExpandable, isExpanded })` | Renders the cell. `rowIndex` is the index of the row in the `rows` you passed (not its pinned or scrolled position). `isDetails` is `true` inside the expansion popover. `setCellProps` sets attributes of the cell from its content (call it from an effect). |
| `initialWidth`, `minWidth`, `maxWidth` | `initialWidth` is a number of pixels, or a function of the grid width, used until the user resizes the column. |
| `isResizable` | Allow resizing from the header edge. |
| `isSortable`, `schema` | Whether the column can be sorted (needs `sorting`), and the kind of values (`'datetime'`, `'numeric'`, `'boolean'`) which words the sort actions. |
| `actions` | The header menu: `{ showSortAsc, showSortDesc, showMoveLeft, showMoveRight, showHide, additional }`, or `false` for none. |
| `cellActions`, `visibleCellActions` | `EuiDataGridColumnCellAction[]` shown in the hover/focus bubble (the first `visibleCellActions`) and in the popover footer (all of them). |
| `isExpandable` | Whether cells can be expanded into a popover. Defaults to `true`. |
| `renderCellExpansionFooter(row)` | Extra content at the bottom of the popover, e.g. a warning. |
| `cellCss` | Emotion styles for every cell of the column, applied after the default cell styles. |

`DATA_GRID_REVEAL_ON_ROW_HOVER_CLASS` hides an element until its row is hovered or one of its cells has
focus. Prefer it over styling the grid's internal DOM.

## Toolbar and `EuiDataGrid` props

The toolbar controls (column selector, sort selector, display options, keyboard shortcuts, full screen)
and the pagination are exported as building blocks. `EuiDataGridAdapter` puts the grid, the toolbar and
the pagination together and takes the props of `EuiDataGrid`: columns, `columnVisibility`, control
columns, `renderCellValue` and `cellContext`, `renderCellPopover`, `sorting`, `pagination`,
`toolbarVisibility` and `renderCustomToolbar`, `gridStyle`, `rowHeightsOptions`, `onColumnResize`
(also called with `width: undefined` when a column is reset), `virtualizationOptions` and the ref
methods. A table that describes itself to `EuiDataGrid` can move to
the new grid by swapping the component, the flag decides which one renders:

```tsx
const DataGridComponent = isKbnDataGridEnabled ? EuiDataGridAdapter : EuiDataGrid;
```

`UnifiedDataTable` does it with its `isKbnDataGridEnabled` prop. The adapter also puts the attributes of
`EuiDataGrid` on the DOM (`euiDataGridRowCell`, `data-gridcell-row-index`,
`euiDataGridHeaderCell--controlColumn`), which the in-table search of `UnifiedDataTable` uses to find
and mark cells.

## Not supported yet

Trailing control columns in pinned rows, a footer row, dragging headers on touch screens, a custom
grid body (`renderCustomGridBody`), in-memory sorting and pagination, a non-interactive mode and a
render-complete signal. The adapter also leaves out `schemaDetectors`.

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
