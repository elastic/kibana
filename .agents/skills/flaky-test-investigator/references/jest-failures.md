# Jest failures (unit and integration)

Applies to failed-test issues whose title starts with `Jest Tests.` (unit, jsdom) or `Jest Integration Tests.` (real ES + Kibana). Unlike Scout/FTR, Jest runs ship **no screenshot, no Playwright trace, and — by default — no server log**, so the diagnosis leans on timeouts, per-test timing, and the resource signals described below.

## How Jest runs on CI

Jest runs through `jest_all` ([`run_all.ts`](../../../../src/platform/packages/shared/kbn-test/src/jest/run_all.ts)), which launches **one Jest process per config** and forces `--runInBand` (all of a config's test files run serially in a single process):

- **Unit** (`jest.config.js`): up to `JEST_MAX_PARALLEL=3` config processes at once.
- **Integration** (`jest.integration.config.js`): `JEST_MAX_PARALLEL=1`.
- **Sharding**: large configs are split via [`.buildkite/sharded_jest_configs.json`](../../../../.buildkite/sharded_jest_configs.json) (config path -> shard count). A shard is annotated as `config.js||shard=1/2` and reported per shard.

### Timeout budgets (know which one fired)

- **Unit per-test**: Jest default **5000 ms**, unless the config raises it (e.g. `cases/jest.config.js` uses `10000`).
- **Integration**: `jest.setTimeout(10 * 60 * 1000)` -> **600000 ms** per test/hook ([`after_env.integration.js`](../../../../src/platform/packages/shared/kbn-test/src/jest/setup/after_env.integration.js)).
- **React Testing Library**: `asyncUtilTimeout: 4500` and `waitFor`'s own default of ~1000 ms ([`react_testing_library.js`](../../../../src/platform/packages/shared/kbn-test/src/jest/setup/react_testing_library.js)). This matters: a genuine "element never appeared" rejects at ~1000/4500 ms with a `TestingLibraryElementError` — **below** the 5000 ms budget.

## The bare-timeout stall (the most common Jest unit failure)

Signature: `Exceeded timeout of N ms for a test` (or `... for a hook`) with **no `TestingLibraryElementError`, no assertion diff, no product/console error**, on a test whose logic is fully mocked/synchronous. Because a real assertion miss would reject below the budget (see above), burning the *entire* budget means the event loop stalled — CPU/GC contention on the shared `--runInBand` agent — not a logic failure.

Corroborating evidence (any of these strengthens "starvation", not "defect"):

- sibling tests in the same file passed in well under a second in the same run;
- a **second, unrelated** suite in the same Jest job timed out at the same instant (shard-wide starvation);
- the job **retried to green** with no other real failures on the build.

### Data to confirm it

1. **Per-test / neighbor timing** — download the failing shard's `target/junit/**` XML; every `<testcase>` carries a `time`. Co-slowdown of neighbors = shard-wide starvation.
   - Caveat: if the job **retried to green**, the retained junit reports `failures="0"` and the failed attempt's per-test map is gone. Fall back to the `target/test_failures/*.log` timeout records (scope with `--job-uuid` for the failed attempt) and the signals below.
2. **Heap** — CI Jest runs with `--logHeapUsage`, so each config's log section prints heap after every file; steady growth points at a leak/pressure rather than a one-off stall.
3. **Event-loop lag + agent load** — `target/agent_diagnostics/jest-metrics-*.json` (written per config/shard by the failing attempt itself, so a retry-green can't shadow it). High event-loop-delay p99/max or high `loadavg` on the failing shard is direct starvation evidence. It records the parallelism context (`JEST_MAX_PARALLEL`, shard, `BUILDKITE_PARALLEL_JOB`) too.
4. **Baseline via a targeted re-run** — ci-stats records historical per-test durations but is **write-only** (no read API this workflow can query), so confirm the baseline by re-running the file in isolation: `node scripts/jest <file> --runInBand --logHeapUsage` (or a flaky-test-runner batch). If it finishes far under budget, the CI timeout was contention, not intrinsic cost.

## Classify, and prefer an actionable verdict over `insufficient-data`

The same "heavy test blew the budget" phenomenon can be `ci-environment` **or** `test-needs-update`. Before defaulting to `ci-environment` + `insufficient-data`, check whether a **code lever** makes it actionable:

- **Split an oversized config.** If a config maps many test files into one (or too few) shards and the stall recurs, raise its shard count in [`.buildkite/sharded_jest_configs.json`](../../../../.buildkite/sharded_jest_configs.json). (Reference: `flyout/jest.config.js` runs 8 shards; `flyout_v2/jest.config.js` has none.)
- **Delete or collapse redundant heavy renders.** When several tests each mount the full provider tree just to assert on content that is already covered — more cheaply — at a lower layer, delete the duplicates or collapse them into a single render-once test. This removes cost instead of paying for it repeatedly.
- **Split/trim a heavy integration `beforeAll`.** A hook that boots the whole stack (and sometimes restarts it several times) in one file can exceed the 10-minute budget on a contended agent; split into one scenario per file and trim the boot surface (avoid `createRootWithCorePlugins` with unrelated plugins).

Guidance:

- Recurrence + a heavy-render/heavy-boot cause with one of the levers above -> `test-needs-update` (actionable), not `insufficient-data`.
- Isolated first-time stall, test/product ruled out, no code lever -> `ci-environment` (and per the main workflow rules, a non-recurring `ci-environment` blip can be closed).
- Never recommend a bare `testTimeout` bump as the fix — it does not hold.

## Jest integration failures

Usually a hook/bootstrap timeout or ES connectivity loss (`NoLivingConnectionsError`, `ECONNRESET`). Localize where the time went using the logs now captured on failure:

- **Kibana server log** — suites that configure a file appender write it under `target/test_failures/` (uploaded on failure). Read the startup timeline to tell "ES failed to start" from "Kibana startup stalled" from "`waitForFleetSetup` never resolved".
- **ES output** — captured under `target/` on failure: `proc [es]` stdout/stderr for **stateful** `kbn-es` runs, and the ES **Docker container logs** for **serverless** runs. This separates a broken daily ES snapshot / ES crash from CI-agent slowness.

If the run predates these captures (older builds), say the server/ES log was unavailable rather than guessing.

## Listing artifacts

`bk artifacts list <build> -p <pipeline> --job-uuid <jobId> --json` lists everything uploaded for the failing job. Always pass the failed attempt's `--job-uuid` — a build that retried to green hides the failed attempt's artifacts otherwise.
