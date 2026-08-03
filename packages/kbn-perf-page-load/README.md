# @kbn/perf-page-load

Lighthouse performance benchmarking CLI for Kibana. Measures page-load performance (FCP, LCP, TBT, TTI, CLS, Speed Index) and Kibana-specific custom metrics (`first_app_nav`, `bootstrap_started`) against dev or production dist builds.

## Prerequisites

```bash
yarn kbn bootstrap
```

## Commands

### `run` — Single benchmark

Run a Lighthouse audit against the current checkout.

```bash
node scripts/perf_page_load.js run [--dist] [--throttle devtools] [--output path]
```

| Flag | Description |
|---|---|
| `--dist` | Build and serve production dist bundles (minified, tree-shaken). Without this, the dev optimizer compiles at runtime. |
| `--throttle` | `provided` (no throttle, default) or `devtools` (40ms RTT, 10 Mbps, 4x CPU slowdown). `devtools` requires `--dist`. |
| `--output` | Save the JSON results to a file for later comparison. |

**Examples:**

```bash
# Dev mode, no throttling
node scripts/perf_page_load.js run

# Dist build with realistic throttling
node scripts/perf_page_load.js run --dist --throttle devtools

# Save results to a file
node scripts/perf_page_load.js run --output results/baseline.json
```

---

### `compare` — Compare two saved result files

Compare two previously saved JSON result files offline, without re-running benchmarks.

```bash
node scripts/perf_page_load.js compare <file1> <file2> [--threshold 5]
```

| Flag | Description |
|---|---|
| `<file1>` | Path to the baseline JSON result file. |
| `<file2>` | Path to the comparison JSON result file. |
| `--threshold` | Regression threshold percentage (default: 5). Exits non-zero if exceeded. |

For each metric, the delta column is a percent change vs the baseline. When the baseline value is **0** and the comparison is non-zero, the change is expressed vs a small **baseline floor** so the percentage stays defined and comparable to `--threshold`: **1 ms** for millisecond metrics, **0.01** for CLS. When both values are **0**, the delta is **0%**.

**Example:**

```bash
node scripts/perf_page_load.js run --output before.json
# ... make changes ...
node scripts/perf_page_load.js run --output after.json
node scripts/perf_page_load.js compare before.json after.json --threshold 3
```

---

### `compare-refs` — Compare two git refs

Check out each ref into a temporary worktree, bootstrap, optionally build dist bundles, run Lighthouse, and compare results.

```bash
node scripts/perf_page_load.js compare-refs <ref1> <ref2> [--dist] [--throttle devtools] [--threshold 5]
```

| Flag | Description |
|---|---|
| `<ref1>` | Git ref for the baseline (branch, tag, or commit SHA). |
| `<ref2>` | Git ref to compare against. |
| `--dist` | Build dist bundles for each ref before benchmarking. |
| `--throttle` | `provided` (default) or `devtools`. `devtools` requires `--dist`. |
| `--threshold` | Regression threshold percentage (default: 5). Exits non-zero if exceeded. |

**Examples:**

```bash
# Compare two commits
node scripts/perf_page_load.js compare-refs abc1234 def5678 --dist --throttle devtools

# Compare HEAD against a specific commit
node scripts/perf_page_load.js compare-refs HEAD abc1234 --dist

# Compare HEAD against main
node scripts/perf_page_load.js compare-refs HEAD main --dist --throttle devtools
```

> **Note:** Each ref goes through a full bootstrap + build + Lighthouse cycle in an isolated
> worktree. Expect 15-30 minutes per ref depending on whether `--dist` is used.

---

### `compare-optimizers` — Legacy vs Rspack *(rspack-transition)*

Run back-to-back benchmarks on the current working tree — first with the legacy Webpack optimizer, then with Rspack — and output a side-by-side comparison.

```bash
node scripts/perf_page_load.js compare-optimizers [--dist] [--throttle devtools] [--threshold 5]
```

| Flag | Description |
|---|---|
| `--dist` | Build dist bundles for each optimizer. |
| `--throttle` | `provided` (default) or `devtools`. `devtools` requires `--dist`. |
| `--threshold` | Regression threshold percentage (default: 5). |

**Example:**

```bash
node scripts/perf_page_load.js compare-optimizers --dist --throttle devtools
```

> **Note:** This command is tagged `[rspack-transition]` and will be removed when the legacy
> optimizer is fully deprecated. Legacy runs first to avoid stale shared-deps artifacts.

---

## Use cases

### Compare performance across two commits

```bash
node scripts/perf_page_load.js compare-refs abc1234 def5678 --dist --throttle devtools
```

### Compare current work against a baseline commit

```bash
node scripts/perf_page_load.js compare-refs HEAD abc1234 --dist
```

### Compare a PR against its base branch

Self-contained check that benchmarks the PR tip against the merge base with `main` (or any target branch). Uses `git merge-base` which is always available — no external tools required.

```bash
# Find the common ancestor between HEAD and the target branch
MERGE_BASE=$(git merge-base HEAD origin/main)
node scripts/perf_page_load.js compare-refs HEAD "$MERGE_BASE" --dist --throttle devtools --threshold 5
```

In CI, most systems provide the target branch as an environment variable (e.g., Buildkite: `BUILDKITE_PULL_REQUEST_BASE_BRANCH`, GitHub Actions: `GITHUB_BASE_REF`). Use it directly:

```bash
MERGE_BASE=$(git merge-base HEAD "origin/$TARGET_BRANCH")
node scripts/perf_page_load.js compare-refs HEAD "$MERGE_BASE" --dist --throttle devtools --threshold 5
```

### Incremental development workflow

Save results before and after changes, then compare offline:

```bash
node scripts/perf_page_load.js run --output before.json
# ... make changes ...
node scripts/perf_page_load.js run --output after.json
node scripts/perf_page_load.js compare before.json after.json --threshold 3
```

---

## Quick reference

| Goal | Command |
|---|---|
| Single benchmark | `node scripts/perf_page_load.js run` |
| Legacy vs Rspack | `node scripts/perf_page_load.js compare-optimizers` |
| Commit A vs Commit B | `node scripts/perf_page_load.js compare-refs <A> <B>` |
| HEAD vs a commit | `node scripts/perf_page_load.js compare-refs HEAD <commit>` |
| HEAD vs base branch (PR) | `node scripts/perf_page_load.js compare-refs HEAD $(git merge-base HEAD origin/main)` |
| Two saved JSON files | `node scripts/perf_page_load.js compare <f1> <f2>` |

Add `--dist` to any command to benchmark production bundles, and `--throttle devtools` for realistic network/CPU conditions.

---

## Metrics collected

| Metric | Source |
|---|---|
| Performance Score | Lighthouse weighted score (0-100) |
| FCP (First Contentful Paint) | Lighthouse audit |
| LCP (Largest Contentful Paint) | Lighthouse audit |
| TBT (Total Blocking Time) | Lighthouse audit |
| TTI (Time to Interactive) | Lighthouse audit |
| Speed Index | Lighthouse audit |
| CLS (Cumulative Layout Shift) | Lighthouse audit |
| `bootstrap_started` | Kibana custom `kbnLoad` performance mark (from Chrome trace) |
| `first_app_nav` | Kibana custom `kbnLoad` performance mark (from Chrome trace) |

### How custom Kibana metrics are extracted

Kibana emits `performance.mark('kbnLoad', { detail: 'phase_name' })` at key lifecycle points. The Lighthouse user-timings audit strips the `detail` property when building its table, so we bypass the audit and read directly from `artifacts.Trace.traceEvents` where Chrome serializes the full mark data including `args.data.detail`.

---

## Environment variables

| Variable | Description |
|---|---|
| `KBN_USE_RSPACK` | Set to `true` to use the Rspack optimizer. When unset, the legacy Webpack optimizer is used. Affects `run`, `compare-refs`, and which path `compare-optimizers` builds. |

## Pages benchmarked

The default spec audits two pages:
1. **Home** — `/app/home`
2. **eCommerce Dashboard** — `/app/dashboards#/view/722b74f0-b882-11e8-a6d9-e546fe2bba5f`
