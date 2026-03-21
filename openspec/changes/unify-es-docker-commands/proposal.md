## Why

Kibana has two overlapping ways to run Elasticsearch in Docker for development and testing: `yarn es docker` (`runDockerContainer`) and `yarn es snapshot --docker` (`runDockerSnapshotContainer`). They share ~60% of their logic but diverge significantly in security defaults, readiness checks, networking, container lifecycle, and CLI flags. This duplication causes confusion ("which command should I use?"), makes the Docker path harder to maintain, and means improvements to one path don't benefit the other. The test infrastructure (`test_es_cluster.ts`, Cypress parallel runner) exclusively uses the snapshot-docker path, while `yarn es docker` is only usable interactively — creating a split where CI/test and developer experiences diverge unnecessarily.

## What Changes

- `yarn es docker` gains a new `--snapshot` flag that activates snapshot-docker behavior (security enabled, detached mode, readiness check, native realm setup, etc.). Without `--snapshot`, the command behaves exactly as it does today.
- `yarn es docker` also gains all flags currently exclusive to `runDockerSnapshotContainer`, usable with `--snapshot`:
  - `--license` flag (trial/basic)
  - `--version` flag (resolves `{version}-SNAPSHOT` automatically)
  - `--background` flag (detached mode + returns after readiness check)
  - `--name` flag (custom container name for parallel runs)
  - `--transport-port` flag (configurable transport port)
  - `--ready-timeout` / `--skip-ready-check` flags
  - Automatic `host.docker.internal` networking setup
  - Volume-mount intelligence for `-E path.data` and file-valued args
  - `cluster.remote.*.seeds` localhost→host.docker.internal rewriting
  - Extra default ES args: `action.destructive_requires_name=true`, `cluster.routing.allocation.disk.threshold_enabled=false`, `ingest.geoip.downloader.enabled=false`, `search.check_ccs_compatibility=true`
- `runDockerSnapshotContainer` logic is folded into `runDockerContainer`, gated on a `snapshot` option. `runDockerSnapshotContainer` is removed.
- `Cluster.runDockerSnapshot()` is removed; `Cluster.runDocker()` absorbs its capabilities (activated by passing `snapshot: true`).
- `stopDockerSnapshotContainer` is generalized to `stopDockerContainer`.
- `yarn es snapshot --docker` is removed. Error message directs users to `yarn es docker --snapshot`.
- `test_es_cluster.ts` and Cypress parallel runner are updated to call `Cluster.runDocker({ snapshot: true, ... })`.
- Default behavior of `yarn es docker` (without `--snapshot`) is **unchanged**: security disabled, foreground, no readiness check.
- The serverless Docker path (`yarn es serverless` / `runServerlessCluster`) is **not** affected.

## Capabilities

### New Capabilities
- `unified-es-docker`: Single Docker command for running stateful Elasticsearch in both interactive and programmatic (test/CI) contexts, replacing both `runDockerContainer` and `runDockerSnapshotContainer`. Snapshot-docker behavior is opt-in via `--snapshot` flag.

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **`src/platform/packages/shared/kbn-es/`**: Changes to `utils/docker.ts` (merge two runner functions, unify interfaces), `cluster.ts` (remove `runDockerSnapshot` method), `cli_commands/docker.ts` (add new flags), `cli_commands/snapshot.ts` (remove `--docker` flag).
- **`src/platform/packages/shared/kbn-test/`**: `test_es_cluster.ts` switches from `runDockerSnapshot` to `runDocker` with `snapshot: true`.
- **`src/platform/packages/shared/kbn-scout/`**: `run_elasticsearch.ts` — no code change needed (flows through `test_es_cluster.ts`).
- **`x-pack/solutions/security/plugins/security_solution/scripts/run_cypress/parallel.ts`**: No change needed (flows through `test_es_cluster.ts`).
- **Test files**: `docker.test.ts` and `cluster.test.ts` need updates to cover the unified function.
- **Developer workflows**: `yarn es docker` (without flags) works exactly as before. Anyone using `yarn es snapshot --docker` switches to `yarn es docker --snapshot`.
- **CI**: No Buildkite scripts directly invoke these commands, but `TEST_ES_FROM=docker` env var continues to work (flows through `test_es_cluster.ts` which passes `snapshot: true`).
