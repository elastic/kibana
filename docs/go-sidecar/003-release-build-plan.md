# Plan: Include Go sidecar in release build

**Status:** Implemented

## Goal

Make `node scripts/build --release` cross-compile the Go sidecar binary for
each target platform and include it in the Kibana distribution, so the sidecar
works out of the box in production — not just in dev mode.

## Current state

- The sidecar binary is compiled manually via `go build` in `src/platform/sidecar/`.
- `http_service.ts` hardcodes the path as `src/platform/sidecar/kbn_sidecar`
  relative to `homeDir` (repo root in dev, install dir in production).
- The release build has no knowledge of the Go binary — it's absent from the
  distributable.
- `scripts/build_sidecar.js` exists but is out of date (old `kbn-sidecar`
  naming, operator precedence bug) and only builds for the host platform.

## Approach

### 1. Build task: `src/dev/build/tasks/build_sidecar_task.ts`

Follow the FIPS provider pattern (`src/dev/build/tasks/fips/bundle_fips_provider_task.ts`).

```typescript
export const BuildSidecar: Task = {
  description: 'Cross-compiling Go sidecar binary for each target platform',
  async run(config, log, build) {
    for (const platform of config.getTargetPlatforms()) {
      const goos = platform.isWindows() ? 'windows' : platform.isLinux() ? 'linux' : 'darwin';
      const goarch = platform.getArchitecture() === 'x64' ? 'amd64' : 'arm64';
      const ext = platform.isWindows() ? '.exe' : '';
      const outputName = `kbn_sidecar${ext}`;
      const outputPath = build.resolvePathForPlatform(platform, 'bin', outputName);

      await exec(log, 'go', ['build', '-o', outputPath, './cmd/kbn_sidecar/'], {
        cwd: config.resolveFromRepo('src/platform/sidecar'),
        env: { ...process.env, GOOS: goos, GOARCH: goarch, CGO_ENABLED: '0' },
      });

      log.info(`Built sidecar for ${goos}/${goarch}: ${outputPath}`);
    }
  },
};
```

Key points:
- `CGO_ENABLED=0` — Go cross-compiles natively, no Docker needed (unlike FIPS).
- One binary per platform directory, placed under `bin/` alongside `kibana`.
- Uses `exec` from `../../lib` (same utility as FIPS task).

### 2. Wire the task into the build pipeline

**`src/dev/build/tasks/index.ts`** — add export:
```typescript
export { BuildSidecar } from './build_sidecar_task';
```

**`src/dev/build/build_distributables.ts`** — call in `createPlatformFolders`
block, after `CreateArchivesSources`:
```typescript
await globalRun(Tasks.BuildSidecar);
```

### 3. Update runtime binary path resolution

**`src/core/packages/http/server-internal/src/http_service.ts`** — the path must
resolve correctly in both dev and production:

```typescript
const ext = process.platform === 'win32' ? '.exe' : '';
const sidecarBinPath = this.env.packageInfo.dist
  ? pathResolve(this.env.homeDir, 'bin', `kbn_sidecar${ext}`)
  : pathResolve(this.env.homeDir, 'src/platform/sidecar', `kbn_sidecar${ext}`);
```

`packageInfo.dist` is `true` in distribution builds, `false` in dev. This is
the standard Kibana pattern for dev-vs-production path branching.

### 4. Fix `scripts/build_sidecar.js`

- `kbn-sidecar` → `kbn_sidecar` (output name and build path)
- Fix operator precedence: wrap the fallback ternary in parens
- This script is for local dev convenience; the build task handles release

### 5. Build prerequisite: Go toolchain

The build environment must have Go installed. This is the same constraint as
having Node.js and npm — Go is a build-time dependency, not a runtime one.

For CI, the Kibana CI images would need Go installed. Document the requirement
and check for `go` in the `VerifyEnv` task or at the top of `BuildSidecar`.

## Files to modify

| File | Change |
|------|--------|
| `src/dev/build/tasks/build_sidecar_task.ts` | New — cross-compile task |
| `src/dev/build/tasks/index.ts` | Export `BuildSidecar` |
| `src/dev/build/build_distributables.ts` | Call `BuildSidecar` in platform phase |
| `src/core/packages/http/server-internal/src/http_service.ts` | Dev/prod path branching |
| `scripts/build_sidecar.js` | Fix naming and precedence bug |

## Verification

1. Cross-compilation works locally:
   ```
   GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o /tmp/test ./cmd/kbn_sidecar/
   file /tmp/test  # should show ELF 64-bit x86-64
   ```
2. Build task runs in pipeline:
   ```
   node scripts/build --skip-archives --skip-os-packages
   ls build/default/kibana-*-linux-x86_64/bin/kbn_sidecar
   ls build/default/kibana-*-darwin-aarch64/bin/kbn_sidecar
   ```
3. Dev mode still works with `server.sidecar.enabled: true`
4. Extracted distributable with sidecar enabled starts and routes through Go
