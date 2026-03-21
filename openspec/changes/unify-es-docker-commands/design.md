## Context

Kibana's `@kbn/es` package provides tooling to run Elasticsearch for development and testing. Two separate Docker code paths exist:

1. **`runDockerContainer`** (called by `yarn es docker`): A simple foreground Docker runner. Disables security, no readiness check, no background mode. ~30 lines. Used only for interactive developer use.
2. **`runDockerSnapshotContainer`** (called by `yarn es snapshot --docker`): A full-featured runner. Enables security, sets up native realm passwords, waits for cluster readiness, runs detached, supports `--background`, `--license`, `--name`, `--transport-port`, volume-mount intelligence, and `host.docker.internal` networking. ~165 lines. Used by `test_es_cluster.ts` (FTR/Scout) and Cypress parallel runner.

Both live in `src/platform/packages/shared/kbn-es/src/utils/docker.ts` and share helper functions but have divergent interfaces (`DockerOptions` vs `DockerSnapshotOptions`), divergent defaults, and divergent behavior.

The serverless path (`runServerlessCluster` / `yarn es serverless`) is separate and unaffected.

## Goals / Non-Goals

**Goals:**
- Single `runDockerContainer` function that serves both interactive and programmatic use cases, with snapshot-docker behavior opt-in via a `snapshot` flag
- Single `Cluster.runDocker()` method replacing both `runDocker()` and `runDockerSnapshot()`
- `yarn es docker --snapshot` activates all snapshot-docker behavior (security, readiness check, detached mode, native realm, extra default args)
- `yarn es docker` without `--snapshot` behaves identically to today (no breaking change)
- Remove `--docker` flag from `yarn es snapshot`
- Maintain backward compatibility for programmatic callers (`test_es_cluster.ts`, Cypress) by passing `snapshot: true`

**Non-Goals:**
- Changing the serverless Docker path (`runServerlessCluster`, `yarn es serverless`)
- Changing how `yarn es snapshot` works without `--docker` (local binary download path)
- Changing the default behavior of `yarn es docker` (security, readiness, etc.)
- Adding new capabilities beyond what the two paths already provide collectively

## Decisions

### 1. `--snapshot` flag gates the snapshot-docker behavior

**Decision**: Add a `snapshot` boolean option to `DockerOptions` and a `--snapshot` CLI flag to `yarn es docker`. When set, it activates: security enabled by default, detached mode, readiness check, native realm setup, extra default ES args, host.docker.internal networking, volume-mount intelligence, and seed rewriting. Without it, `yarn es docker` behaves exactly as today.

**Rationale**: This is the safest approach — zero breaking changes to interactive developer workflows. The `--snapshot` flag is the opt-in mechanism for the richer behavior that `yarn es snapshot --docker` currently provides.

**Alternative considered**: Change defaults and add `--no-security` for opt-out. Rejected because it breaks existing interactive workflows and scripts.

### 2. Merge into `runDockerContainer`, not the other way around

**Decision**: Absorb `runDockerSnapshotContainer`'s capabilities into `runDockerContainer` (gated on `snapshot: true`) and delete the snapshot variant.

**Rationale**: `runDockerContainer` is the natural name for "run ES in Docker." The snapshot variant's name is a historical artifact.

### 3. Unified `DockerOptions` interface

**Decision**: Extend `DockerOptions` to include all fields from `DockerSnapshotOptions` plus a new `snapshot` boolean:

```typescript
export interface DockerOptions extends EsClusterExecOptions, BaseOptions {
  dockerCmd?: string;
  snapshot?: boolean;
  license?: string;
  version?: string;
  name?: string;
  background?: boolean;
  transportPort?: number;
}
```

`BaseOptions` already provides `port`, `ssl`, `kill`, `tag`, `image`, `esArgs`, `password`.

**Rationale**: Single interface, single function. When `snapshot` is falsy, the new fields are ignored and behavior is identical to today.

### 4. Remove `--docker` from `yarn es snapshot` in a single step

**Decision**: Remove the `--docker` flag entirely (no deprecation period). Print a clear error message pointing to `yarn es docker --snapshot`.

**Rationale**: This is internal developer tooling, not a public API. The error message provides clear migration guidance.

### 5. Container cleanup via `stopDockerContainer(name)`

**Decision**: Generalize `stopDockerSnapshotContainer` to `stopDockerContainer(name)` — it already just runs `docker kill` + `docker rm`.

**Rationale**: Nothing snapshot-specific about stopping a container by name.

### 6. Default ES args split by mode

**Decision**: The extra default args (`action.destructive_requires_name`, `cluster.routing.allocation.disk.threshold_enabled`, `ingest.geoip.downloader.enabled`, `search.check_ccs_compatibility`) are only applied when `snapshot: true`. The plain `yarn es docker` defaults remain unchanged (security disabled, single-node, 1536m heap).

**Rationale**: Preserves exact backward compatibility for the non-snapshot path.

## Risks / Trade-offs

- **[Two behavioral modes in one function]** The `snapshot` flag creates a significant branch in `runDockerContainer` → Mitigation: Extract the snapshot-specific setup into a clearly named helper (e.g., `applySnapshotDefaults`) to keep the main function readable
- **[Test breakage if interface misaligned]** `test_es_cluster.ts` calls `cluster.runDockerSnapshot()` with specific options → Mitigation: keep all option names the same in the merged interface; update callers in the same PR
- **[CI impact]** If `TEST_ES_FROM=docker` is set anywhere in CI, it flows through `test_es_cluster.ts` → Mitigation: `test_es_cluster.ts` changes are mechanical (method rename + add `snapshot: true` + same options)
- **[Discovery]** Developers may not know about `--snapshot` → Mitigation: clear `--help` output describing both modes; error message when `yarn es snapshot --docker` is used
