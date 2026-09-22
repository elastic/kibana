# @kbn/core-server-benchmarks

Benchmarks that start a real Kibana distributable against a real Elasticsearch and
measure what it costs. The one wired into CI is the **warm-start memory** benchmark,
which detects unintended heap growth introduced by a PR.

## The warm-start memory check

Kibana's startup heap is retained for the lifetime of the process, so growth there
permanently reduces headroom in Cloud and Serverless and raises the OOM rate. This
benchmark catches that growth before it merges.

### Protocol

Elasticsearch is started once and kept running. Kibana is cold-started once and
discarded to prime caches. Every measured iteration then starts Kibana, waits
30 seconds after `Kibana is now available` for it to settle, forces a garbage
collection over the Inspector protocol, and samples the heap.

The decision metric is the **post-forced-GC heap**, so it measures retained memory
rather than garbage that happened not to have been collected yet.

Measurements are **paired**: the baseline and the target are run back to back and
each pair yields one delta. Pair order alternates deterministically (AB, BA, AB, BA)
so that within-pair order bias cancels out. Four pairs are required; the decision is
the mean of the four paired deltas.

### Threshold

A run is a regression when the mean paired delta exceeds **5 MiB**
(`WARM_START_MEMORY_THRESHOLD_BYTES`). Linux calibration measured a paired standard
deviation of 0.5-1.5 MiB and cleanly separated a known +11 MiB regression from a
same-artifact control at ~0 MiB, so the threshold sits an order of magnitude above
the noise floor.

Fewer than four valid pairs produces `inconclusive` rather than a pass, so a flaky
run never reads as a clean result.

## Running it in CI

`.buildkite/scripts/steps/warm_start_memory_bench.sh` runs on every pull request as a
non-blocking step. It compares two prebuilt distributables and never builds Kibana:

- **target** — the `kibana-default.tar.zst` the PR's own build step already uploaded
- **baseline** — the same artifact from the `kibana-on-merge` build for `GITHUB_PR_MERGE_BASE`

The step skips itself when the baseline artifact has expired or the PR reused a
cached distributable, since neither case can produce a meaningful comparison.

On a regression it posts a PR comment; results are also shipped to ci-stats under the
`warm start memory` group for historical tracking. It never fails the build.

## Running it locally

Against two git refs, building each one as needed:

```bash
node scripts/bench.js \
  --config src/platform/packages/shared/kbn-core-server-benchmarks/ci_warm_start_memory.benchmark.config.ts \
  --config-from-cwd \
  --left <baseline-ref> \
  --right <target-ref>
```

Against two distributables you already have, which is much faster and is what CI does:

```bash
node scripts/bench.js \
  --config src/platform/packages/shared/kbn-core-server-benchmarks/ci_warm_start_memory.benchmark.config.ts \
  --config-from-cwd \
  --left-build-dir <baseline-dist-dir> \
  --right-build-dir <target-dist-dir>
```

Each build dir is either a distributable directory containing `bin/kibana` or a
directory containing a platform-specific `kibana-*` distributable.

Note that a local run reproduces the signal but not the calibration: the 5 MiB
threshold was calibrated on Linux CI hardware, and macOS in particular shows
different absolute numbers.

## Reading the report

Every run writes `target/warm_start_memory_regression_report.json` (override with
`KIBANA_CI_WARM_START_MEMORY_REPORT_PATH`). In CI it is uploaded as a build artifact.

- `outcome` — `observed`, `inconclusive`, or `regression`
- `postForcedGcHeapUsed` — the decision metric: `meanBytes`, `sampleStandardDeviationBytes`, and per-pair baseline/target values
- `tailHeapUsed` — the natural, pre-GC tail heap, useful for telling retained memory apart from GC pressure
- `comparison` — requested, attempted, and valid pair counts plus the pair order actually run
- `starts` — per-start raw samples and forced-GC stats for debugging a noisy run
- `diagnostics` — RSS, heap total, external memory, and array buffers

A regression usually traces back to a new top-level import in server code or a schema
(Zod or `@kbn/config-schema`) built eagerly at module load that could be built lazily.
See `dev_docs/tutorials/performance/peak_memory_profiling.mdx` for how to find what is
being retained.

## Calibration

`ci_warm_start_memory/run_calibration.sh` re-runs the calibration campaign against
pinned known-good and known-regressed artifacts, asserting the expected outcome for
each orientation (`aa`, `ab`, `ba`). Run it after changing the forced-GC signal or the
paired decision rule. The artifact pins expire with Buildkite retention and must be
refreshed before a new campaign.
