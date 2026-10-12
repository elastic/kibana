# Recording a wait baseline

Use the Node version in `.nvmrc`. In a fresh worktree, bootstrap dependencies and
build the browser bundles before running FTR:

```sh
node scripts/kbn bootstrap
node scripts/build_kibana_platform_plugins --test-plugins
```

Run the complete config with wait recording enabled:

```sh
FTR_RECORD_WAITS=1 TEST_BROWSER_HEADLESS=1 node scripts/functional_tests \
  --config src/platform/test/functional/apps/visualize/group1/config.ts
```

Each execution writes a new directory under
`target/ftr-wait-recordings/src/platform/test/functional/apps/visualize/group1/config.ts/<timestamp>-<pid>/`:

- `waits.json`: config, file, test, and hook timings, plus individual wait spans
  with relative timestamps, call stacks, and completion status.
- `trace.json`: a Chrome trace that can be loaded into Perfetto or another Chrome
  trace viewer to inspect the test and wait timelines together.

`FTR_RECORD_WAITS=1` enables recording centrally for any FTR config; no config
changes are required. `FTR_WAIT_RECORDING_DIRECTORY` can override the output root.
Each config gets a directory matching its repository-relative config path, and
each execution gets a unique subdirectory. Recording is disabled by default.
Recording begins with
Mocha execution, so dependency installation, server startup, and service
initialization are excluded. Shared hooks have their own records and are
attributed to the file defining the hook. Failed test attempts remain separate
from retries. Tests that call `this.skip()` at runtime retain their timings with
a `skipped` result; pending tests that never start have no runtime span.
A failed or interrupted execution is diagnostic output, not a
successful baseline.

## Interpreting the measurements

- `sleepAndBackoffMs` measures time in `common.sleep()` and retry delays, including
  initial retry delays. It includes necessary waits as well as potential waste.
- `waitMs` also includes WebDriver's explicit waits. Those durations include
  condition checks and browser work, not just time sleeping.
- `waitOrLookupMs` additionally includes element lookup commands, which can block
  on implicit waits. Their browser/transport time cannot be separated from
  implicit waiting by this recorder.
- `byCategory.retry` measures the entire retry operation, including its callback.
  It is useful context and is excluded from the aggregate wait totals.

Totals use the union of intervals, so nested or overlapping operations are not
counted twice. Category totals can overlap and must not be added together.
Per-test and per-hook totals are clipped to that runnable's interval. A wait
still in progress at shutdown has `completed: false` and ends at shutdown.

Inspect long lookup spans and their selectors, then correlate their stacks and
surrounding retry/delay spans to identify candidates for investigation. This is
an execution trace rather than a browser video; it measures the instrumented
operations and does not infer visual inactivity or prove that a wait is avoidable.
Direct timers outside `common.sleep()` and the retry service are not captured.

Collect repeated successful runs on the same machine, browser, commit, and
headless setting. Compare file and config totals as well as the individual wait
sites. The recording and stack capture add some overhead, so compare recorded
runs with other recorded runs; avoid treating a single cold run as definitive.

Configs can also opt in directly:

```ts
waitRecording: {
  enabled: true,
  directory: '/absolute/path/to/recordings', // Output root; config/run directories are added.
},
```

Custom wait helpers can use the lifecycle service's `recordWait(category, name,
callback)` method. The callback's result and errors are preserved, and recording
is disabled by default.
