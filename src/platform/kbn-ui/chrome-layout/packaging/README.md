# @kbn/ui-chrome-layout — Packaging

This directory contains the build infrastructure that produces a self-contained
`@kbn/ui-chrome-layout` tarball for use outside of Kibana (e.g. Cloud UI).

## Building

```bash
./scripts/build.sh
```

Output lands in `../target/`:
- `index.js` — bundled CommonJS module
- `index.d.ts` — TypeScript declarations
- `metadata.json` — build metadata (name, version, gitSha, timestamp)
- `package.json` — installable manifest with peer-dependency declarations
- `kbn-ui-chrome-layout-<version>.tgz` — installable tarball

## How it works

`@kbn/ui-chrome-layout-constants` and `@kbn/ui-chrome-layout-utils` are aliased
at build time to their pre-built outputs under `../../chrome-layout-constants/target/`
and `../../chrome-layout-utils/target/`. Run those packages' `build.sh` first if
their targets are missing (Step 0 of this script does this automatically).

## Example app

```bash
# Build the package first
./scripts/build.sh

# Start the dev server (http://localhost:3000)
cd example && ./start.sh
```
