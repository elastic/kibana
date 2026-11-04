# @kbn/ui-chrome-layout — Packaging

This directory contains the build infrastructure that produces a self-contained
`@kbn/ui-chrome-layout` tarball for use outside of Kibana (e.g. Cloud UI).

The tarball includes layout components, constants, and utilities.

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

## Example app

```bash
# Build the package first
./scripts/build.sh

# Start the dev server (http://localhost:3000)
cd example && ./start.sh
```

## Host requirements

- Wrap the layout in an EUI provider.
- Install React 18 or later, EUI, and Emotion as peer dependencies.
- Use the layout as the single full-viewport application shell.

`GridLayoutGlobalStyles` contains only shell-level document and EUI overlay behavior, plus the
generic `plain` / `framed` appearance. Kibana DOM selectors, legacy compatibility variables, and
application-specific global styles are not included in the package.
