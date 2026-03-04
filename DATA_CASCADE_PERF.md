# DataCascade Tab-Switch Performance Investigation

Tracking document for [#255745](https://github.com/elastic/kibana/issues/255745) -- lag when restoring a previously visited Discover tab containing a Group By (DataCascade) layout.

## Architecture

The performance problem has three compounding layers:

- **Layer 1 -- Full unmount/remount on tab switch.** `TabsView` renders `<SingleTabView key={currentTabId} />`, forcing React to completely tear down and rebuild the entire tab tree on every switch. Both standard and cascade tabs pay this cost, but cascade is far more expensive because of the deeper component tree.
- **Layer 2 -- Cascade layout initialization.** On every remount, the cascade layout must re-initialize `@tanstack/react-table` and `@tanstack/react-virtual`, parse the ES|QL query for stats metadata, and rebuild the grouped data structure.
- **Layer 3 -- Multiple concurrent EuiDataGrid instances.** Each expanded leaf row in the cascade mounts a full `UnifiedDataTable` (which wraps `EuiDataGrid`). With `overscan=25`, up to 25 visible rows can each mount their own EuiDataGrid instance simultaneously.

The DataCascade container itself does NOT use EuiDataGrid -- it is built on `@tanstack/react-table` + `@tanstack/react-virtual`. EuiDataGrid only enters the picture through the leaf cells.

### Key files

| File | Role |
|------|------|
| `src/platform/plugins/shared/discover/public/application/main/components/tabs_view/tabs_view.tsx` | Tab switching with `key={currentTabId}` (Layer 1). |
| `src/platform/plugins/shared/discover/public/application/main/components/layout/cascaded_documents/cascaded_document_layout.tsx` | Cascade layout with `overscan={25}` (Layer 2). |
| `src/platform/plugins/shared/discover/public/application/main/components/layout/cascaded_documents/blocks/cascade_leaf_component.tsx` | Each expanded leaf mounts full `UnifiedDataTable` (Layer 3). |
| `src/platform/packages/shared/kbn-unified-tabs/src/components/tabbed_content/tabbed_content.tsx` | Only renders selected tab content (Layer 1). |
| `src/platform/packages/shared/shared-ux/document_data_cascade/impl/src/components/data_cascade_impl/data_cascade_impl.tsx` | DataCascade container (TanStack-based). |

## Test Harness

Scout performance test: `x-pack/platform/plugins/private/discover_enhanced/test/scout/ui/tests/discover_cascade_tab_switch_perf.spec.ts`

### What it measures

For each tab switch (standard grid restore vs cascade layout restore):

- **Wall-clock duration** -- `performance.now()` delta from click to content-ready signal.
- **Script duration** -- CDP `ScriptDuration` delta (time spent executing JS).
- **Layout duration** -- CDP `LayoutDuration` delta (time spent in layout recalculation).
- **Layout count** -- number of `UpdateLayoutTree` events during the switch.
- **Style recalc count** -- number of `RecalcStyleCount` events during the switch.
- **Node count** -- total DOM nodes after the switch.
- **Heap used** -- JS heap size after the switch.

Each scenario is measured 3 times; the median is reported.

### Prerequisites

The cascade layout is behind the `discover.cascadeLayoutEnabled` feature flag, which defaults to `false`. The test enables it at runtime via `apiServices.core.settings()`, so no special server args are needed.

### How to run

```bash
node scripts/scout.js start-server --arch stateful --domain classic

npx playwright test \
  --config x-pack/platform/plugins/private/discover_enhanced/test/scout/ui/playwright.config.ts \
  --project local --grep "baseline" --headed
```

---

## Baseline (unmodified main)

> **Status**: Captured on 2026-03-04 against `main` (local, macOS, headed Chromium).

Query: `FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip`

| Metric | Standard tab | Cascade tab | Ratio |
|--------|-------------|-------------|-------|
| Wall clock (ms) | 322 | 826 | 2.6x |
| Script duration (ms) | 72 | 266 | 3.7x |
| Layout duration (ms) | 12 | 14 | 1.2x |
| DOM nodes | 16,532 | 19,727 | 1.2x |

**Key takeaway:** The bottleneck is script execution (3.7x), not layout (1.2x). This points to React reconciliation and JS initialization cost (mounting the cascade tree with TanStack table/virtualizer and any visible leaf `UnifiedDataTable` instances) rather than CSS/layout reflow. The cascade adds ~3,200 extra DOM nodes.

---

## Fix Evaluations

Each fix is applied in isolation, tested, and then reverted. Deltas are relative to the baseline.

### Fix 2a: Reduce cascade overscan (25 -> 5)

**File**: `cascaded_document_layout.tsx` -- change `overscan={25}` to `overscan={5}`.

**Hypothesis**: Fewer rows in the virtualized window means fewer cascade rows and leaf grids mounted on tab restore. Primarily reduces Layer 2 and Layer 3 cost.

| Metric | Standard tab | Cascade tab | Ratio | Delta vs baseline |
|--------|-------------|-------------|-------|-------------------|
| Wall clock (ms) | 311 | 341 | 1.1x | **-59% (826->341)** |
| Script duration (ms) | 72 | 110 | 1.5x | **-59% (266->110)** |
| Layout duration (ms) | 13 | 10 | 0.8x | -29% (14->10) |

**Result**: Enormous impact. Cascade tab restore drops from 826ms to 341ms (1.1x vs standard, down from 2.6x). Script time cut by 59%. This single change nearly eliminates the performance gap. The overscan of 25 was mounting far too many rows off-screen during tab restore.

### Fix 2b: Defer leaf grid mounting

**File**: `cascade_leaf_component.tsx` -- wrap `UnifiedDataTable` in `requestAnimationFrame`-deferred mount with a placeholder.

**Hypothesis**: Spreads mount cost across frames, reducing longest blocking task.

| Metric | Standard tab | Cascade tab | Ratio | Delta vs baseline |
|--------|-------------|-------------|-------|-------------------|
| Wall clock (ms) | 312 | 810 | 2.6x | -2% (within noise) |
| Script duration (ms) | 73 | 254 | 3.5x | -5% (within noise) |
| Layout duration (ms) | 13 | 14 | 1.1x | 0% |

**Result**: Negligible impact. Deferring by one frame shifts work but doesn't reduce total mount cost. All leaf cells schedule their `requestAnimationFrame` callbacks simultaneously, so they still mount in the same frame. This approach would need per-leaf staggering to be effective, but that complicates scroll behavior.

### Fix 2c: Memoize cascade leaf computations

**File**: `cascade_leaf_component.tsx` -- stabilize `cellData` and toolbar references.

**Hypothesis**: Eliminates unnecessary re-renders of `React.memo` components, amplified by N leaf instances.

**Result**: Skipped (analysis only). Memoization (`useMemo`, `useCallback`, `React.memo`) optimizes **re-renders**, not initial mounts. On a tab switch, the entire tree is freshly mounted -- there are no previous values for memos to compare against. One minor issue found: `renderCustomToolbarWithElements` depends on `[cellData]` (array reference) instead of `[cellData.length]` (the count displayed), but this only affects re-render efficiency, not tab-switch latency. This fix would be useful for general rendering performance but does not address the tab-switch problem.

### Fix 3a: Remove `key={currentTabId}` (in-place update instead of unmount/remount)

**File**: `tabs_view.tsx` -- remove `key={currentTabId}` from `<SingleTabView>` so React reuses the component instance across tab switches instead of unmounting and remounting.

**Hypothesis**: Eliminates the full unmount/remount cycle (Layer 1). React diffs the old tree against the new tree and makes minimal DOM changes.

| Metric | Standard tab | Cascade tab | Ratio | Delta vs baseline |
|--------|-------------|-------------|-------|-------------------|
| Wall clock (ms) | 174 | 561 | 3.2x | **-32% (826->561)** |
| Script duration (ms) | 34 | 146 | 4.3x | **-45% (266->146)** |
| Layout duration (ms) | 6 | 7 | 1.2x | -50% (12->6 std) |
| DOM nodes | 12,012 | 14,346 | -- | -27% fewer nodes |

**Result**: Strong absolute improvement -- cascade drops from 826ms to 561ms. Both tabs benefit (standard also drops from 322ms to 174ms). However, the cascade/standard **ratio** actually increases from 2.6x to 3.2x because the simpler standard grid benefits more from in-place updates than the complex cascade tree. This change alone is not sufficient to close the gap, but it significantly reduces absolute latency for both scenarios. Note: removing the key may cause state leakage between tabs (scroll position, expanded docs, etc.) -- a production implementation would need a full hide/show cache rather than just removing the key.

### Fix 3b: Lighter leaf component

**File**: `cascade_leaf_component.tsx` -- replace full `UnifiedDataTable` per leaf with a purpose-built lightweight renderer.

**Hypothesis**: Each `EuiDataGrid` instance has significant initialization cost. A lighter renderer can be 5-10x cheaper to mount.

**Result**: Skipped -- not measurable with current test. Leaf cell content (which mounts `UnifiedDataTable`) only renders when `!isGroupNode && rowIsExpanded && hasAllParentsExpanded` (see `cascade_row.tsx` L117). In our test, no groups are expanded, so zero `UnifiedDataTable` instances are mounted during tab switches. The entire 826ms baseline cost comes from the cascade container and group header rows, not from leaf grids. This fix would matter for a scenario where the user expands groups before switching tabs -- a separate test with group expansion is needed to evaluate it.

---

## Aggregate Evaluation

Stack the two most effective individual fixes and re-run.

**Fixes applied**: Fix 2a (overscan 25->5) + Fix 3a (remove `key={currentTabId}`)

| Metric | Standard tab | Cascade tab | Ratio | Delta vs baseline |
|--------|-------------|-------------|-------|-------------------|
| Wall clock (ms) | 179 | 251 | 1.4x | **-70% (826->251)** |
| Script duration (ms) | 33 | 66 | 2.0x | **-75% (266->66)** |
| Layout duration (ms) | 6 | 5 | 0.8x | -64% (14->5) |
| DOM nodes | 6,682 | 7,646 | -- | -61% fewer nodes |

**Target**: Cascade tab restore within 1.5x of standard tab restore latency. **Achieved: 1.4x.**

## Conclusions

1. **Fix 2a (reduce overscan) is the highest-impact, lowest-risk change.** A single line change (`overscan={25}` to `overscan={5}`) cuts cascade tab restore by 59%. This should be the immediate recommendation to the maintaining engineer. The current overscan of 25 is excessive -- it pre-renders 25 rows beyond the viewport, which is unnecessary for the cascade's row sizes and introduces massive mount cost on tab restore.

2. **Fix 3a (eliminate unmount/remount) provides additive benefit but is architecturally complex.** Removing `key={currentTabId}` avoids the full React teardown/rebuild cycle, cutting another ~30% from cascade restore. However, a production implementation needs proper tab state isolation (a full hide/show cache pattern) rather than simply removing the key, which would cause state leakage between tabs.

3. **Deferred mounting (Fix 2b) is ineffective** because all deferred callbacks fire in the same frame.

4. **Memoization (Fix 2c) is irrelevant** for tab-switch performance since the problem is initial mount cost, not re-render cost.

5. **Lighter leaf component (Fix 3b) is untestable** with the current test setup (no groups expanded). It would matter in a scenario where the user expands groups before switching tabs.

6. **The bottleneck is script execution, not layout.** Script time accounts for 3.7x of the baseline gap vs only 1.2x for layout. This confirms the cost is React reconciliation and JS initialization (TanStack table/virtualizer setup, component mounting), not CSS/DOM layout.

### Recommended actions for the maintaining engineer

- **Immediate (low risk):** Reduce `overscan` from 25 to a smaller value (5-10) in `cascaded_document_layout.tsx`. This is a one-line change with massive impact.
- **Medium-term (higher effort):** Investigate tab content caching in `kbn-unified-tabs` to avoid full unmount/remount cycles. This benefits all tab types, not just cascade.
- **Consider:** Whether the `renderCustomToolbarWithElements` memo dependency on `[cellData]` should be `[cellData.length]` for re-render efficiency (separate from tab-switch performance).

---

## Phase 2: Deeper Analysis

> **Status**: Captured on 2026-03-04. Fix 3a (remove `key={currentTabId}`) is applied for all Phase 2 tests so that component state (expanded groups, scroll position) survives tab switches. Fix 3a had negligible impact on the cascade/standard ratio in Phase 1 (3.2x vs 2.6x baseline) but reduces absolute latency for both tabs. Applying it here is necessary to test the expanded-groups scenario, since without it the cascade tree is fully unmounted on tab switch and all expansion state is lost.

### 2.1 Expanded groups with Fix 3a

**Setup**: 3 root groups expanded on the cascade tab before measuring tab-switch latency. With Fix 3a applied, the expansion state persists across tab switches (React reuses the component tree instead of tearing it down).

| Metric | Standard tab | Cascade tab | Ratio |
|--------|-------------|-------------|-------|
| Wall clock (ms) | 194 | 586 | 3x |
| Script duration (ms) | 36 | 153 | 4.3x |
| DOM nodes | 12,847 | 15,181 | -- |

**Comparison**: The collapsed cascade with Fix 3a measured 561ms wall / 146ms script (from Phase 1 Fix 3a). Adding 3 expanded groups costs only ~25ms wall / ~7ms script extra. This confirms that once the leaf `UnifiedDataTable` instances are mounted, they persist cheaply across tab switches with Fix 3a. The per-expanded-group marginal cost is negligible (~8ms wall each).

**Without Fix 3a**: Groups do **not** survive tab switches. The `key={currentTabId}` pattern causes a full unmount/remount of `SingleTabView`, resetting the DataCascade to its default collapsed state. This means users who expand groups and switch away lose their expansion state entirely -- a UX problem independent of performance.

### 2.2 CPU profiling: hot function comparison

CDP `Profiler.start`/`stop` captured during a cascade tab restore. Top functions by self time:

**Original (with `key={currentTabId}` -- full unmount/remount):**

| Self time | % total | Function | Source |
|-----------|---------|----------|--------|
| 277.2ms | 10.2% | `calculateScrollState` | discover.chunk.28.js:2314 |
| 32.5ms | 1.2% | `measureElement` | discover.chunk.28.js:9724 |
| 15.0ms | 0.5% | `createEmotionProps` | kbn-ui-shared-deps-npm.dll.js |
| 15.0ms | 0.5% | `murmur2` | kbn-ui-shared-deps-npm.dll.js |
| 12.5ms | 0.5% | `createElement` | kbn-ui-shared-deps-npm.dll.js |

**With Fix 3a (in-place update -- no unmount/remount):**

| Self time | % total | Function | Source |
|-----------|---------|----------|--------|
| 47.1ms | 1.3% | `measureElement` | discover.chunk.28.js:9724 |
| 32.6ms | 0.9% | `calculateScrollState` | discover.chunk.28.js:2314 |
| 21.7ms | 0.6% | `createElement` | kbn-ui-shared-deps-npm.dll.js |
| 21.7ms | 0.6% | `createEmotionProps` (3x) | kbn-ui-shared-deps-npm.dll.js |
| 18.1ms | 0.5% | `serializeStyles` | kbn-ui-shared-deps-npm.dll.js |

**Key finding**: `calculateScrollState` is the single largest bottleneck in the original path, consuming 277ms (10.2% of total CPU time). This is the TanStack Virtual scroll state computation that runs on every fresh mount. Fix 3a reduces it to 33ms (an 8.4x improvement on this single function) because the virtualizer's scroll state is preserved in memory rather than recomputed from scratch. The remaining cost is spread across `measureElement` (DOM size measurement), Emotion CSS processing, and React element creation -- none of which individually dominate.

### 2.3 Overscan scaling curve

All measurements with Fix 3a applied (collapsed cascade, no groups expanded). This isolates the per-row cost of the cascade virtualizer's overscan.

| Overscan | Cascade wall (ms) | Standard wall (ms) | Wall ratio | Cascade script (ms) | Script ratio | Cascade nodes |
|----------|-------------------|--------------------| -----------|---------------------|--------------|---------------|
| 0 | 198 | 184 | 1.1x | 45 | 1.1x | 7,577 |
| 2 | 206 | 181 | 1.1x | 48 | 1.4x | 5,372 |
| 5 | 264 | 186 | 1.4x | 69 | 1.8x | 22,611 |
| 10 | 309 | 178 | 1.7x | 84 | 2.3x | 8,934 |
| 15 | 387 | 194 | 2x | 110 | 2.9x | 10,981 |
| 25 | 582 | 191 | 3x | 155 | 4x | 11,213 |

**Per-row marginal cost**: (582 - 198) / 25 = ~15.4ms wall, (155 - 45) / 25 = ~4.4ms script per overscan row. The relationship is approximately linear.

**Sweet spot**: Overscan of 2-5 keeps the cascade within 1.1-1.4x of the standard grid. Values above 10 push the ratio past 1.5x, and the default of 25 produces a 3x slowdown.

### Phase 2 conclusions

1. **`calculateScrollState` is the root cause of the unmount/remount penalty.** At 277ms (10.2% of CPU), it dwarfs every other function. It runs on every fresh mount of the TanStack virtualizer. Fix 3a eliminates this cost by preserving the virtualizer instance.

2. **Expanded groups are cheap once mounted.** With Fix 3a, 3 expanded groups (each containing a full `UnifiedDataTable` leaf) add only ~25ms to tab-switch latency. The leaf cells persist in memory and require no re-initialization.

3. **Overscan scales linearly at ~15ms/row.** Each additional overscan row adds a consistent ~15ms wall-clock cost. The current default of 25 is far too high for a component that may be unmounted/remounted. Even with Fix 3a, overscan=25 produces a 3x wall-clock ratio.

4. **Emotion CSS processing is a steady-state tax.** `createEmotionProps` and `serializeStyles` appear repeatedly in both profiles. They aren't the dominant bottleneck but contribute a cumulative ~100ms. Consider whether static CSS class names (via `css` prop memoization or extracted stylesheets) could reduce this.

5. **Fix 3a enables user state persistence.** Beyond performance, removing `key={currentTabId}` is the only way to preserve expansion state, scroll position, and other in-tab UI state across tab switches. Without it, users lose their work every time they switch tabs. A production implementation should use a hide/show cache rather than simply removing the key.
