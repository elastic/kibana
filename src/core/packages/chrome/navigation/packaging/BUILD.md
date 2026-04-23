# Building @kbn/one-navigation

## Prerequisites

- Node.js (version from Kibana's `.nvmrc`)
- Yarn
- Kibana repository bootstrapped (`yarn kbn bootstrap`)

## Build

```bash
# From Kibana root
./scripts/build_one_navigation.sh

# Or from the packaging directory
cd src/core/packages/chrome/navigation/packaging
./scripts/build.sh
```

## Output

Artifacts in `src/core/packages/chrome/navigation/target/`:

| File | Description |
|------|-------------|
| `index.js` | Bundled JavaScript (+ source map) |
| `index.d.ts` | TypeScript declarations |
| `package.json` | Package manifest |

## Build steps

1. **Type validation** — `tsc --noEmit` checks that the standalone types in
   `packaging/react/types.ts` are compatible with the source types.
2. **Webpack bundle** — compiles and bundles the component, replacing `@kbn/*`
   imports with local stubs via aliases.
3. **Declaration generation** — produces `index.d.ts` from the standalone types.
4. **Manifest copy** — copies `package.json` into the output directory.
