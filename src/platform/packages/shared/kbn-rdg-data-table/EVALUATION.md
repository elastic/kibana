# react-data-grid evaluation (POC)

Benchmark of the three Discover grids with the same Scout harness
(`src/platform/plugins/shared/discover/test/scout/grid_performance`), 2026-10-19.

- Grids: `unified` (EuiDataGrid), `tanstack` (`@kbn/tanstack-data-table`), `rdg` (this package, `react-data-grid@7.0.0-beta.47`).
- Synthetic index: 10,000 docs × 100 fields. Paged scenarios: 500 rows per page. Logs scenarios: `filebeat-*` index in an Observability space, which switches Discover to a single page of 10,000 rows.
- Medians of 5 page loads, 1920×1080, Kibana dev mode (React development build, so absolute numbers are inflated), no CPU throttling. All grids render 3-line rows (64–65 px).

## Results

| scenario | metric | EUI | TanStack | RDG |
|---|---|---:|---:|---:|
| 500 rows, summary | render after data | 383 ms | 280 ms | **206 ms** |
| 500 rows, 10 cols | render after data | 547 ms | 278 ms | **155 ms** |
| 500 rows, 50 cols | render after data | 662 ms | 563 ms | **163 ms** |
| 500 rows, 100 cols | render after data | 755 ms | 872 ms | **162 ms** |
| 500 rows, 100 cols | vertical scroll fps / p95 frame / jank frames | 49.4 / 33 ms / 0 | 14.8 / 83 ms / 38 | **60 / 17 ms / 0** |
| 500 rows, 100 cols | scripting during 3 s of scrolling | 1,745 ms | 2,451 ms | **454 ms** |
| 500 rows, 100 cols | grid DOM nodes | 5,368 | 11,214 | **560** |
| 500 rows, 100 cols | JS heap after GC | 244 MB | 498 MB | **220 MB** |
| 500 rows, 100 cols | row selection commit | 70.6 ms | 92.2 ms | **29 ms** |
| 10k rows logs, summary | render after data | 1,028 ms | 1,023 ms | **811 ms** |
| 10k rows logs, 50 cols | render after data | 1,333 ms | 1,279 ms | **832 ms** |
| 10k rows logs, 50 cols | vertical scroll fps / jank frames | 50.3 / 0 | 21.9 / 9 | **60 / 0** |

## Findings

- react-data-grid virtualizes rows **and columns**. Its DOM size, scroll cost and render time stay flat as columns grow (560 nodes for 10, 50 or 100 columns). The TanStack grid only virtualizes rows, so it degrades the most with wide tables. EUI virtualizes both, but each cell costs more.
- RDG is the fastest in every scenario. With few columns the gap to TanStack is small (about 25%); with 50 or more columns RDG renders 3–5× faster and is the only grid that scrolls at 60 fps without long frames.
- With 10,000 rows about 800 ms of the render is shared work outside the grid (preparing the records), which all three grids pay.

## Caveats

- The POC renders the same cell content as the TanStack grid. It does **not** have cell popovers and cell actions, header action menus, in-table search, column reordering or pinning, comparison mode or auto row height. Part of the gap comes from that missing per-cell work, not only from the grid engine. The column-count scaling, though, comes from column virtualization, which the TanStack grid would have to add itself.
- Kibana runs in dev mode with React's development build. Re-run against a production build before final decisions.
- `react-data-grid@7.0.0-beta.47` is the last release that supports React 18 (later releases need React 19), and it dates from September 2024. Shipping it would mean either an old, unmaintained beta, or waiting for Kibana's React 19 migration (elastic/kibana#256181) and then upgrading (API renames, ESM only).

## Reproduce

```bash
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet discover_rdg_grid
DISCOVER_GRID_PERF=true DISCOVER_GRID_PERF_RUNS=5 node scripts/playwright test --project local \
  --config src/platform/plugins/shared/discover/test/scout_discover_rdg_grid/grid_performance/ui/playwright.config.ts
```

Use the `discover_unified_grid` config set and `scout_discover_unified_grid` config for EUI, and no config set with the `scout` config for TanStack. Results go to `target/discover_grid_performance/<implementation>.json`; add `DISCOVER_GRID_PERF_SCREENSHOTS=true` for a screenshot per scenario.
