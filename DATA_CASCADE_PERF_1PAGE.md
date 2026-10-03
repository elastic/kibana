# DataCascade Tab-Switch Performance: Summary

Investigation of [#255745](https://github.com/elastic/kibana/issues/255745) -- lag when restoring a Discover tab with a Group By (DataCascade) layout.

## Problem

Switching to a previously visited cascade tab takes **826ms** (2.6x slower than a standard grid tab at 322ms). The dominant cost is **script execution (3.7x)**, not layout (1.2x), confirming the bottleneck is React component mounting and JS initialization -- not CSS reflow.

## Root Causes

Three compounding layers drive the cost:

1. **Full unmount/remount on every tab switch.** `TabsView` uses `key={currentTabId}`, forcing React to tear down and rebuild the entire component tree.
2. **Excessive virtualization overscan.** The cascade layout sets `overscan={25}`, pre-rendering 25 rows beyond the viewport on every mount. Each row includes TanStack table/virtualizer initialization.
3. **Heavy leaf cells (when groups are expanded).** Each expanded leaf mounts a full `UnifiedDataTable` (wrapping `EuiDataGrid` with toolbar, column management, nested virtualizer). Note: this layer was not active in our baseline test since no groups were expanded.

## What We Tested

Built a Scout performance test (`discover_cascade_tab_switch_perf.spec.ts`) using CDP metrics to measure tab-switch latency across 3 runs per scenario. Evaluated 5 fixes in isolation, then stacked the best two.

## Results

| Fix | Cascade (ms) | vs Baseline | Cascade/Standard Ratio |
|-----|-------------|-------------|------------------------|
| **Baseline** | **826** | -- | **2.6x** |
| **2a: Overscan 25 -> 5** | **341** | **-59%** | **1.1x** |
| 2b: Deferred leaf mount | 810 | -2% (noise) | 2.6x |
| 2c: Better memoization | skipped | n/a (mount-only cost) | -- |
| **3a: Remove key (no remount)** | **561** | **-32%** | 3.2x |
| 3b: Lighter leaf component | skipped | n/a (no leaves mounted) | -- |
| **2a + 3a combined** | **251** | **-70%** | **1.4x** |

## Recommendations

- **Do now (1 line, huge impact):** Change `overscan={25}` to `overscan={5}` in `cascaded_document_layout.tsx`. This alone cuts cascade restore by 59% and brings the ratio to 1.1x.
- **Do next (architectural):** Implement tab content caching in `kbn-unified-tabs` (hide/show via CSS instead of unmount/remount). This benefits all tab types and provides an additive 30% reduction. Requires proper state isolation per tab.
- **Minor cleanup:** Fix `renderCustomToolbarWithElements` memo dependency from `[cellData]` to `[cellData.length]` for re-render efficiency.

## Key Insight

The initial suspicion that `EuiDataGrid` was the bottleneck is **partially incorrect** for the tab-switch scenario. The DataCascade container does not use `EuiDataGrid` -- it's built on `@tanstack/react-table` + `@tanstack/react-virtual`. `EuiDataGrid` only mounts inside expanded leaf cells, which are not rendered until the user expands a group. The baseline tab-switch cost is entirely from the cascade container and its group header rows, amplified by an overscan of 25.

## Artifacts

- Full investigation log: [`DATA_CASCADE_PERF.md`](DATA_CASCADE_PERF.md)
- Automated test: [`discover_cascade_tab_switch_perf.spec.ts`](x-pack/platform/plugins/private/discover_enhanced/test/scout/ui/tests/discover_cascade_tab_switch_perf.spec.ts)
