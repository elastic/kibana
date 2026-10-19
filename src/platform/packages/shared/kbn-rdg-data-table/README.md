# @kbn/rdg-data-table

Proof of concept: the Discover TanStack grid (`@kbn/tanstack-data-table`) with its rows and columns rendered by [react-data-grid](https://github.com/Comcast/react-data-grid) instead of the built-in TanStack body. It compares the grid engines with the same features.

- `RdgDataGrid` is `TanStackDataGrid` with the `gridBody` prop set to `RdgGridBody`. The toolbar, display settings, column and sort popovers, header actions, cell popovers and cell actions, in-table search, selection, comparison mode, pagination and footer are the TanStack grid's.
- `RdgGridBody` renders the TanStack header and body cells inside react-data-grid, which virtualizes rows and columns. Pinned columns are frozen columns.
- Pinned to `react-data-grid@7.0.0-beta.47`, the last release that supports React 18. Later releases need React 19.
- Enable it in Discover with the `discover.enableRdgTable` feature flag, which takes precedence over `discover.enableTanstackTable`.
- Differences from the TanStack body: auto row height uses the estimated height (react-data-grid needs explicit row heights), keyboard navigation is react-data-grid's, and rows can't be virtualized by a parent element (`useRowVirtualizer`, used by the cascade layout).
