# Building OneNavigation

Guide for Elastic team members building `@kbn/one-navigation` locally.

## Prerequisites

- Node.js version from Kibana's `.nvmrc`
- Yarn
- Kibana repository access

## Build

From Kibana root:

```bash
yarn kbn bootstrap
./scripts/build_one_navigation.sh
```

Or from packaging directory:

```bash
cd src/core/packages/chrome/navigation/packaging
./scripts/build.sh
```

## Output

Artifacts in `src/core/packages/chrome/navigation/target/`:
- `index.js` - Bundled JavaScript (~26 KB minified)
- `index.d.ts` - TypeScript definitions
- `package.json` - Package manifest
- `*.js.map` - Source maps

## Testing

Run the example application:

```bash
cd src/core/packages/chrome/navigation/packaging/example
yarn start
```

Opens http://localhost:3000 with a test environment.

## Build Process

### 1. Webpack Bundling
Bundles and transpiles source files. Externalizes peer dependencies (React, EUI, Emotion). Config: `packaging/webpack.config.js`

### 2. Type Validation
Validates duplicated types in `packaging/react/types.ts` match source types. Runs `tsc --noEmit` via `packaging/tsconfig.json`.

**Why:** Types are duplicated for fast builds (~1s) without compiling Kibana dependencies. Validation prevents drift.

**Files:**
- `packaging/react/type_validation.ts` - Imports from both source and packaged types
- `packaging/tsconfig.json` - Build-time validation config (excluded from Kibana's TS_PROJECTS)

### 3. TypeScript Definitions
Generates `.d.ts` files using: `tsc types.ts --declaration --emitDeclarationOnly`

### 4. Package Manifest
Copies `package.json` with metadata and entry points.

## Development Workflow

1. Edit source files in `src/components/navigation/`
2. If changing public API types, update `packaging/react/types.ts`
3. Rebuild: `./scripts/build_one_navigation.sh`
4. Test in example app

### Test in Another Application

1. Build the package
2. In your app's `package.json`:
   ```json
   "@kbn/one-navigation": "file:../path/to/kibana/src/core/packages/chrome/navigation/target"
   ```
3. Run `yarn install`
4. Revert before committing

## Troubleshooting

### Node Version Mismatch
```bash
nvm use  # or nvm install if needed
```

### Build Fails
1. Clear target: `rm -rf target/`
2. Reinstall: `yarn kbn bootstrap`
3. Check TypeScript errors in source files

### Type Validation Fails
Build fails at Step 2 with type compatibility errors.

**Fix:**
1. Check error message for incompatible types
2. Update `packaging/react/types.ts` to match source types
3. Test manually: `cd packaging && npx tsc --project tsconfig.json --noEmit`

**Common causes:** Added/changed/removed fields in source types

### Example App Won't Start
Run `yarn kbn bootstrap` from Kibana root, then use `start.sh` script.

