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

Kibana-specific packages (`@kbn/core-chrome-layout-constants`,
`@kbn/core-chrome-layout-utils`) are replaced at build time with local stubs
under `react/services/`. The stubs provide the same runtime values without
requiring the Kibana package graph.

## Example app

```bash
# Build the package first
./scripts/build.sh

# Start the dev server (http://localhost:3000)
cd example && ./start.sh
```
