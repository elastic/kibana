# react-data-grid evaluation (POC)

Benchmark of the three Discover grids with the same Scout harness
(`src/platform/plugins/shared/discover/test/scout/grid_performance`), 2026-10-19.

- Grids: `unified` (EuiDataGrid), `tanstack` (`@kbn/tanstack-data-table`), and `rdg`: the same TanStack grid with its body rendered by `react-data-grid@7.0.0-beta.47` (`gridBody={RdgGridBody}`).
- `tanstack` and `rdg` have the same features: toolbar, popovers, cell actions, header actions, in-table search, comparison and pagination all come from the TanStack grid. Only the grid engine differs. The Discover data grid Scout suite (84 tests) passes against all three grids.
- Synthetic index: 10,000 docs × 100 fields. Paged scenarios: 500 rows per page. Logs scenarios: `filebeat-*` index in an Observability space, which switches Discover to a single page of 10,000 rows.
- Medians of 5 page loads, 1920×1080, Kibana dev mode (React development build, so absolute numbers are inflated), no CPU throttling. All grids render 3-line rows (64–65 px); differences in DOM row counts are overscan.

## Results

| scenario | metric | EUI | TanStack | RDG |
|---|---|---:|---:|---:|
| 500 rows, summary | render after data | 383 ms | 280 ms | 289 ms |
| 500 rows, 10 cols | render after data | 547 ms | 278 ms | 282 ms |
| 500 rows, 50 cols | render after data | 662 ms | 563 ms | **285 ms** |
| 500 rows, 100 cols | render after data | 755 ms | 872 ms | **323 ms** |
| 500 rows, 100 cols | vertical scroll fps / p95 frame / jank frames | 49.4 / 33 ms / 0 | 14.8 / 83 ms / 38 | **60 / 17 ms / 0** |
| 500 rows, 100 cols | scripting during 3 s of scrolling | 1,745 ms | 2,451 ms | **1,370 ms** |
| 500 rows, 100 cols | grid DOM nodes | 5,368 | 11,214 | **1,387** |
| 500 rows, 100 cols | JS heap after GC | **244 MB** | 498 MB | 297 MB |
| 500 rows, 10 cols | row selection commit | 57.2 ms | **33.9 ms** | 65.8 ms |
| 10k rows logs, summary | render after data | 1,028 ms | 1,023 ms | 983 ms |
| 10k rows logs, 50 cols | render after data | 1,333 ms | 1,279 ms | **965 ms** |
| 10k rows logs, 50 cols | vertical scroll fps / jank frames | 50.3 / 0 | 21.9 / 9 | **57.7 / 0** |

## Findings

- With few columns, RDG and TanStack perform the same. The shared shell and cell components dominate, and both virtualize rows.
- With many columns, react-data-grid's **column virtualization** decides it: render time, DOM size and scroll cost stay flat as columns grow. At 100 columns RDG renders 2.7× faster than TanStack and is the only grid that scrolls at 60 fps without long frames. The TanStack body renders every column of every visible row.
- Row selection is slower in the RDG body (66 vs 34 ms at 10 columns): selection state reaches the cells through one React context, so every visible cell re-renders. Passing it per row, as the TanStack body does, should close the gap.
- With 10,000 rows about 900 ms of the render is shared work outside the grid, which all grids pay.
- Embedding the TanStack shell took a small, additive change to `@kbn/tanstack-data-table`: a `gridBody` prop, the header cell renderer as a function, and an `embedded` mode for `VirtualCell`.

## Caveats

- Auto row height uses the estimated height in the RDG body: react-data-grid needs explicit row heights.
- Keyboard navigation is react-data-grid's. Enter and space open the cell popover. Clicks on controls inside cells don't select the cell, so focus stays where the control puts it (for example the document flyout).
- The RDG body can't be virtualized by a parent element (`useRowVirtualizer`, used by the cascade layout), and it tags react-data-grid's header row with `data-test-subj="dataGridHeader"` from an effect.
- The cell popover can't be unit tested in jsdom. That's also true for the TanStack grid (it hangs); the Scout suite covers it.
- Kibana runs in dev mode with React's development build. Re-run against a production build before final decisions.
- `react-data-grid@7.0.0-beta.47` is the last release that supports React 18 (later releases need React 19), and it dates from September 2024. Shipping it would mean either an old, unmaintained beta, or waiting for Kibana's React 19 migration (elastic/kibana#256181) and then upgrading (API renames, ESM only).

## Reproduce

```bash
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet discover_rdg_grid
DISCOVER_GRID_PERF=true DISCOVER_GRID_PERF_RUNS=5 node scripts/playwright test --project local \
  --config src/platform/plugins/shared/discover/test/scout_discover_rdg_grid/grid_performance/ui/playwright.config.ts
```

Use the `discover_unified_grid` config set and `scout_discover_unified_grid` config for EUI, and no config set with the `scout` config for TanStack. Results go to `target/discover_grid_performance/<implementation>.json`; add `DISCOVER_GRID_PERF_SCREENSHOTS=true` for a screenshot per scenario. The data grid suite against RDG: `scout_discover_rdg_grid/data_grid/ui/parallel.playwright.config.ts`.
