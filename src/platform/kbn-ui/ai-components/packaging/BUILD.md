# Building @kbn/ui-ai-components

## Prerequisites

- Node.js (version from Kibana's `.nvmrc`)
- Kibana repository bootstrapped (`pnpm kbn bootstrap`)

## Build

The publish pipeline invokes `packaging/scripts/build.sh` directly. To build
locally:

```bash
src/platform/kbn-ui/ai-components/packaging/scripts/build.sh
```

## Output

Artifacts in `src/platform/kbn-ui/ai-components/target/`:

| File | Description |
|------|-------------|
| `index.js` (+ `index.js.map`) | Bundled CommonJS + source map |
| `index.d.ts` | TypeScript declarations |
| `package.json` | Package manifest |
| `metadata.json` | Build metadata (name, version, gitSha, buildTimestamp, peerDependencies) |
| `kbn-ui-ai-components-<version>.tgz` | Installable npm tarball |

## Build steps

1. **Type validation**: `tsc --noEmit` checks that the standalone types in
   `packaging/react/types.ts` match the source types and exports
   (`packaging/react/type_validation.ts`).
2. **Webpack bundle**: compiles and bundles the components, replacing
   `@kbn/i18n` and `@kbn/i18n-react` with a local stub via resolver aliases.
   Peer dependencies stay external.
3. **Declaration generation**: emits `index.d.ts` as a regular ES module so
   consumers can import types directly from `@kbn/ui-ai-components`.
4. **Manifest copy**: copies `package.json` into the output directory.
5. **Version stamp**: writes a content-hash version into `target/package.json`.
6. **Metadata**: writes `metadata.json` with name, version, git SHA, build
   timestamp, and peer dependencies. Override the SHA with `BUILD_GIT_SHA`.
7. **Tarball**: `npm pack --force` produces `kbn-ui-ai-components-<version>.tgz`.
   The `--force` flag is required because the manifest is marked `private`.

This package has no kbn-ui dependencies, so there is no dependency build step.

## Consumer smoke test

```bash
mkdir ai-components-check && cd ai-components-check
npm init -y
npm i <path-to>/kbn-ui-ai-components-<version>.tgz \
      @elastic/eui @emotion/react react react-dom
node -e "console.log(Object.keys(require('@kbn/ui-ai-components')))"
```
