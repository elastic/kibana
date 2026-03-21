## 1. Unify DockerOptions Interface

- [ ] 1.1 Extend `DockerOptions` in `docker.ts` to include all fields from `DockerSnapshotOptions` plus a new `snapshot?: boolean`: `license`, `version`, `name`, `background`, `transportPort` (keep existing `dockerCmd`, `BaseOptions` fields)
- [ ] 1.2 Remove the `DockerSnapshotOptions` interface

## 2. Merge Runner Functions

- [ ] 2.1 Add snapshot-mode branch to `runDockerContainer`: when `snapshot: true`, apply snapshot-docker behavior (detached mode, `--add-host host.docker.internal:host-gateway`, transport port mapping, container naming, license→esArg mapping, `path.data` Docker native volume (create named volume when local path doesn't exist, bind-mount when it does), file-valued `-E` arg volume mounts, `cluster.remote.*.seeds` localhost→host.docker.internal rewriting, extra default ES args)
- [ ] 2.2 When `snapshot: true` and `background: true`, add readiness check (`waitUntilClusterReady` with `expectedStatus: 'yellow'`) unless `skipReadyCheck: true`
- [ ] 2.3 When `snapshot: true`, add native realm password setup (`NativeRealm.setPasswords()`) after readiness check unless `skipSecuritySetup: true`
- [ ] 2.4 When `snapshot: true`, enable security by default (set `ELASTIC_PASSWORD`, do NOT add `xpack.security.enabled=false`). When NOT snapshot mode, keep current behavior (security disabled)
- [ ] 2.5 When `snapshot: true`, apply extra default esArgs: `action.destructive_requires_name=true`, `cluster.routing.allocation.disk.threshold_enabled=false`, `ingest.geoip.downloader.enabled=false`, `search.check_ccs_compatibility=true`. When NOT snapshot mode, keep current defaults unchanged
- [ ] 2.6 Return container name (string) from `runDockerContainer` when `snapshot: true` and `background: true`; return `void` otherwise (matching current behavior)
- [ ] 2.7 Delete `runDockerSnapshotContainer` function

## 3. Generalize Container Cleanup

- [ ] 3.1 Rename `stopDockerSnapshotContainer` to `stopDockerContainer` (same implementation, just rename)
- [ ] 3.2 Update all imports/references to `stopDockerSnapshotContainer` → `stopDockerContainer`

## 4. Update Cluster Class

- [ ] 4.1 Remove `Cluster.runDockerSnapshot()` method
- [ ] 4.2 Update `Cluster.runDocker()` to accept the unified `DockerOptions` (with `snapshot`); store `dockerContainerName` (rename from `dockerSnapshotContainerName`) when snapshot+background returns a name
- [ ] 4.3 Update `Cluster.stopCluster()` to call `stopDockerContainer` using the stored container name

## 5. Update CLI Commands

- [ ] 5.1 Add new flags to `cli_commands/docker.ts`: `--snapshot`, `--license`, `--version`, `--background`, `--name`, `--transport-port`, `--ready-timeout`, `--skip-ready-check`
- [ ] 5.2 Remove `--docker` flag from `cli_commands/snapshot.ts`; add error message if `--docker` is detected pointing to `yarn es docker --snapshot`

## 6. Update Callers

- [ ] 6.1 Update `test_es_cluster.ts`: change `esFrom === 'docker'` path from `cluster.runDockerSnapshot()` to `cluster.runDocker({ snapshot: true, ... })` with same options
- [ ] 6.2 Verify Cypress parallel runner (`parallel.ts`) works unchanged since it flows through `test_es_cluster.ts`
- [ ] 6.3 Verify Scout `run_elasticsearch.ts` works unchanged since it flows through `createTestEsCluster`

## 7. Update Exports

- [ ] 7.1 Update `utils/index.ts` exports: remove `runDockerSnapshotContainer`, `stopDockerSnapshotContainer`; ensure `runDockerContainer`, `stopDockerContainer` are exported
- [ ] 7.2 Update any other files importing the old function names

## 8. Update Tests

- [ ] 8.1 Update `docker.test.ts`: add tests for `runDockerContainer` with `snapshot: true` covering detached mode, security defaults, readiness check, license support, container naming; verify non-snapshot mode is unchanged
- [ ] 8.2 Update `cluster.test.ts`: remove `runDockerSnapshot` tests; update `runDocker` tests to cover `snapshot: true` behavior
- [ ] 8.3 Verify existing helper function tests still pass (they should be unaffected)
