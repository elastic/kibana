# Discover grid performance: TanStack DataGrid vs UnifiedDataTable

**Generated:** 2026-08-11  
**Branch:** `pr-255490-tanstack-grid-cleanup`  
**Environment:** local Kibana 9.6.0 + ES 9.6.0-SNAPSHOT, Chromium headless 1440×900  
**Dataset:** `ROW a=1,b="hello",c=3.14,d="x",e="y",f=42,g="more",h="data" // 200x` → **1,600 synthetic rows**  
**Activation:** TanStack default (local storage) / density popover switch  

Harness: [`compare_grids_perf.playwright.ts`](./compare_grids_perf.playwright.ts)  
Raw JSON: [`compare_grids_perf.results.json`](./compare_grids_perf.results.json)

---

## Summary

| Verdict | Detail |
|---|---|
| **Faster first paint path** | TanStack query→visible grid **~8.4s** vs Unified **~10.5s** (includes ES\|QL submit + 5s settle wait) |
| **Lower JS heap (after render)** | TanStack **~346 MB** vs Unified **~369 MB** (−6%) |
| **Fewer long tasks on rapid scroll** | TanStack **38** vs Unified **49** (−22%) |
| **Virtualization** | Both keep a small DOM window; Unified rendered **fewer** grid DOM nodes this run (smaller overscan) |
| **Caveat** | Single run, same browser session (TanStack first). Absolute heap for Unified includes leftover from the prior TanStack mount. Prefer relative scroll/DOM metrics. |

---

## Measured results

### After render (CDP `Performance.getMetrics` + grid DOM)

| Metric | TanStack DataGrid | UnifiedDataTable | Delta (TS − UDT) |
|---|---:|---:|---:|
| Time to grid ready (`renderMs`) | 8,443 ms | 10,452 ms | **−2,009 ms** |
| JS heap used | 345.6 MB | 368.6 MB | **−23.0 MB** |
| Page-wide DOM nodes | 7,059 | 9,518 | **−2,459** |
| Grid DOM nodes | 964 | 563 | +401 |
| Visible grid rows (`role=row`) | 29 | 11 | +18 |
| Visible cells / headers | 87 | 33 | +54 |
| Cumulative script duration | 2.94 s | 3.21 s | −0.27 s |
| Cumulative task duration | 4.95 s | 6.28 s | −1.33 s |
| Layout count | 321 | 324 | −3 |
| Style recalc count | 334 | 368 | −34 |

### Scroll (mid → end → top, instant)

| Metric | TanStack DataGrid | UnifiedDataTable | Delta (TS − UDT) |
|---|---:|---:|---:|
| Wall time | 1,242 ms | 1,229 ms | +13 ms |
| Grid DOM nodes after scroll | 964 (unchanged) | 563 (unchanged) | — |
| Page-wide nodes Δ | +5,492 | 0 | (noisy; see notes) |
| Layout Δ | +3 | 0 | — |
| Style recalc Δ | +3 | 0 | — |
| Heap Δ | +7.9 MB | +0.2 MB | — |
| Long tasks (rapid scroll RAF) | **38** | **49** | **−11** |

---

## How to read this

### What looks better for TanStack
- **Query → interactive grid** was ~2s faster in this run.
- **Heap after render** and **cumulative task/script time** were lower.
- **Long tasks during aggressive scroll** were fewer → less main-thread blocking.

### What looks better for UnifiedDataTable
- **Smaller grid DOM** (563 vs 964) and fewer visible rows — tighter virtualization window / different row chrome.
- **Near-zero layout/style churn** on the programmed scroll path in this run.

### Architecture (resource model)

| | TanStack DataGrid | UnifiedDataTable |
|---|---|---|
| Stack | `@tanstack/react-table` + `@tanstack/react-virtual` | EUI Data Grid / UnifiedDataTable |
| Row model | Virtual window over full row array | Virtual window + richer cell/pipeline chrome |
| Feature weight | Custom parity layer (find, selection, density, popovers, …) still in-tree | Mature product grid |
| DOM strategy | More columns/controls visible → higher per-row node count | Heavier widgets but fewer rows mounted here |

---

## Methodology

1. Log into Discover (ES\|QL mode).
2. Submit the same `ROW … // 200x` body; switch grid via the density popover if needed.
3. Capture CDP metrics after the grid is visible.
4. Scroll the `[role="grid"]` container mid → end → top.
5. Count `longtask` entries during a tight `requestAnimationFrame` scroll loop.
6. Count nodes inside the grid element only (`querySelectorAll('*')` on `[role="grid"]`).

Re-run:

```bash
npx playwright test \
  --config=src/platform/plugins/shared/discover/public/components/discover_grid/tanstack_data_grid/playwright.config.ts \
  src/platform/plugins/shared/discover/public/components/discover_grid/tanstack_data_grid/compare_grids_perf.playwright.ts
```

---

## Limitations / next measurements

- **n=1** — re-run 5× and report median/p95 before treating deltas as significant.
- **Same-tab sequencing** — reverse order (Unified first) and/or fresh contexts to isolate heap.
- **Page-wide CDP node deltas** on scroll are noisy (chrome/tooltips/HMR); trust **grid-scoped DOM** more.
- **`renderMs` includes fixed waits** (~5s after submit); instrument time-to-first-row separately for cleaner TTI.
- Add a **FROM sample_data | LIMIT N** scenario (real documents, summary mode) for a second profile.
- Capture **FPS / INP** if comparing interaction feel, not only CDP counters.

---

## Bottom line

On this synthetic 1,600-row ES\|QL workload, **TanStack DataGrid was quicker to show and used less JS heap / fewer long tasks while scrolling**, while **UnifiedDataTable mounted a smaller DOM window**. Both virtualize; neither materializes 1,600 DOM rows. Treat this as a first-pass CDP snapshot, not a ship/no-ship gate — repeat with medians and reversed order before drawing product conclusions.
