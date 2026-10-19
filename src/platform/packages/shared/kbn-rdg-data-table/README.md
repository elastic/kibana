# @kbn/rdg-data-table

Proof of concept: a Discover document grid built on [react-data-grid](https://github.com/Comcast/react-data-grid), to compare it with `@kbn/tanstack-data-table` and the EuiDataGrid based `@kbn/unified-data-table`.

- Pinned to `react-data-grid@7.0.0-beta.47`, the last release that supports React 18. Later releases need React 19.
- Takes the same props as `TanStackDataGrid`, so Discover can switch grids with a feature flag only. Enable it with `discover.enableRdgTable` (it takes precedence over `discover.enableTanstackTable`).
- Covers the parts needed to compare performance: cell rendering (same cell content as the TanStack grid), summary column, sorting, column resizing, row selection, the document details toggle, row indicators, density and fixed row heights, and pagination.
- Not covered yet: the display settings, columns and sort popovers, in-table search, comparison mode, cell popovers and cell actions, column reordering and pinning, auto row height (react-data-grid needs explicit heights), and the cascade layout.
