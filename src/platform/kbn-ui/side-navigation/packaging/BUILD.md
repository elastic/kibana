# Building @kbn/ui-side-navigation

## Prerequisites

- Node.js (version from Kibana's `.nvmrc`)
- Yarn
- Kibana repository bootstrapped (`yarn kbn bootstrap`)

## Build

The publish pipeline invokes `packaging/scripts/build.sh` directly. To build
locally:

```bash
src/platform/kbn-ui/side-navigation/packaging/scripts/build.sh
```

## Output

Artifacts in `src/platform/kbn-ui/side-navigation/target/`:

| File | Description |
|------|-------------|
| `index.js` (+ `index.js.map`) | Bundled CommonJS + source map |
| `index.d.ts` | TypeScript declarations |
| `package.json` | Package manifest |
| `metadata.json` | Build metadata (name, version, gitSha, buildTimestamp, peerDependencies) |
| `kbn-ui-side-navigation-<version>.tgz` | Installable npm tarball |

## Build steps

1. **Type validation** — `tsc --noEmit` checks that the standalone types in
   `packaging/react/types.ts` stay compatible with the source types.
2. **Webpack bundle** — compiles and bundles the component, replacing
   `@kbn/i18n`, `@kbn/i18n-react`, `@kbn/core-chrome-layout-constants`, and
   `@kbn/core-chrome-layout-utils` with local stubs via resolver aliases.
3. **Declaration generation** — emits `index.d.ts` as a regular ES module
   (not an ambient `declare module` wrapper) so consumers can import types
   directly from `@kbn/ui-side-navigation`.
4. **Manifest copy** — copies `package.json` into the output directory.
5. **Metadata** — writes `metadata.json` with name, version, git SHA, build
   timestamp, and peer dependencies. Override the SHA with `BUILD_GIT_SHA`.
6. **Tarball** — `npm pack --force` produces `kbn-ui-side-navigation-<version>.tgz`.
   The `--force` flag is required because the manifest is marked `private`
   (the artifact is distributed out-of-band, not via the public registry).

## Consumer smoke test

```bash
cd /tmp && mkdir side-nav-check && cd side-nav-check
npm init -y
npm i <path-to>/kbn-ui-side-navigation-<version>.tgz \
      @elastic/eui react react-dom @emotion/react @emotion/css
node -e "console.log(require('@kbn/ui-side-navigation'))"
```
