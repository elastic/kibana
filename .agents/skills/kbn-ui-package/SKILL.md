---
name: kbn-ui-package
description: 'This skill should be used when the user asks to "create a kbn-ui package", "onboard a component to kbn-ui", "package a Kibana component for external distribution", "add a package to kbn-ui", "set up packaging for a Kibana component", or any mention of distributing a Kibana UI component to Cloud UI or external consumers. Guides the full interactive process: gathers inputs, moves source files, scaffolds the packaging layer, and updates all Kibana imports.'
disable-model-invocation: true
---

# kbn-ui Package Onboarding

## Overview

The `kbn-ui` system distributes Kibana UI components as versioned standalone packages for external consumers (e.g. Cloud UI). Each package lives under `src/platform/kbn-ui/` and has two layers:

1. **Source layer** — the Kibana workspace package (`package.json`, `kibana.jsonc`, `src/`, `index.ts`)
2. **Packaging layer** — distribution scaffold (`packaging/`) that bundles the source into a standalone `.tgz` via webpack

Canonical reference: `src/platform/kbn-ui/side-navigation/`

---

## Phase 1 — Gather Inputs

Use `AskUserQuestion` to collect **three** values. `packageName` is always auto-derived — never ask the user for it.

| Variable | Example | Source |
|---|---|---|
| `sourcePath` | `src/platform/packages/private/kbn-grid-layout` | User input |
| `folderName` | `grid-layout` | User input |
| `packageName` | `@kbn/ui-grid-layout` | **Auto-derived**: `@kbn/ui-{folderName}` |
| `description` | `Standalone Elastic grid layout component for non-Kibana applications` | User input |

Questions to ask:
1. "What is the repo-relative path of the existing Kibana package?" (e.g. `src/platform/packages/private/kbn-grid-layout`)
2. "What should the kbn-ui folder name be?" (e.g. `grid-layout` — the package name will be `@kbn/ui-{answer}`)
3. "Short description for the distribution package.json?"

---

## Phase 2 — Analyze Source

Read these files before creating anything:

- `{sourcePath}/package.json` → derive `oldName` (current workspace name, e.g. `@kbn/grid-layout`), `peerDependencies`, `dependencies`
- `{sourcePath}/kibana.jsonc` → derive `owner`, `group`
- `{sourcePath}/index.ts` → list all exported symbols (components, types, utilities)

Run to find all internal `@kbn/*` imports used by the source (search the whole package, not just a `src/` subdirectory — the source dir may have any name):
```bash
grep -roh "from '@kbn/[^']*'" {sourcePath} --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=target --exclude-dir=packaging | sort -u
```

Partition the results:
- **Externalize** — if the package also appears in `peerDependencies` (consumer will provide it)
- **Stub** — everything else (not available outside Kibana; needs a no-op implementation in `packaging/react/services/`)

Count how many Kibana files will need import updates:
```bash
grep -r "from '{oldName}'" src/ x-pack/ packages/ --include="*.ts" --include="*.tsx" -l | wc -l
```

---

## Phase 3 — Confirm with User

Show a summary and use `AskUserQuestion` to confirm before touching any files:

```
Moving:   {sourcePath}/ → src/platform/kbn-ui/{folderName}/
Renaming: {oldName} → {packageName}
@kbn/* stubs to generate: [list from Phase 2]
Kibana files with imports to update: [count from Phase 2]
```

---

## Phase 4 — Execute

### 4a. Move the package and normalize the source directory

```bash
git mv {sourcePath} src/platform/kbn-ui/{folderName}
```

After moving, the source directory inside the package must always be named `src/`. Detect the actual source directory name — it is the non-metadata subdirectory (i.e. not `packaging`, `target`, `__tests__`, etc.):

```bash
# List top-level subdirectories in the moved package (excluding known non-source dirs)
ls -d src/platform/kbn-ui/{folderName}/*/  | grep -vE "/(packaging|target|node_modules)/$"
```

If the source directory is **not** named `src`, rename it:

```bash
git mv src/platform/kbn-ui/{folderName}/{actualDirName} src/platform/kbn-ui/{folderName}/src
```

Store the result as `srcDir = "src"` — all packaging templates must reference `../../src/` from inside `packaging/react/`.

### 4b. Update workspace package.json

Overwrite `src/platform/kbn-ui/{folderName}/package.json` with:

```json
{
  "name": "{packageName}",
  "version": "1.0.0",
  "private": true,
  "license": "Elastic License 2.0 OR AGPL-3.0-only OR SSPL-1.0"
}
```

### 4c. Update kibana.jsonc

Keep `owner`, `group`, `type`, `visibility` from the moved file. Update only the `id` field to `{packageName}`.

### 4d. Create packaging/ scaffold

```bash
mkdir -p src/platform/kbn-ui/{folderName}/packaging/scripts
mkdir -p src/platform/kbn-ui/{folderName}/packaging/react/services
```

#### `packaging/package.json`

```json
{
  "name": "{packageName}",
  "version": "0.1.0",
  "private": true,
  "description": "{description}",
  "main": "index.js",
  "types": "index.d.ts",
  "files": [
    "index.js",
    "index.js.map",
    "index.d.ts",
    "metadata.json",
    "package.json"
  ],
  "peerDependencies": {
    "@elastic/eui": ">=112.0.0",
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "license": "Elastic License 2.0 OR AGPL-3.0-only OR SSPL-1.0"
}
```

Merge any additional peer deps found in the source `package.json` (e.g. `@emotion/react`, `@emotion/css`).

#### `packaging/webpack.config.js`

Start from the side-navigation template (`src/platform/kbn-ui/side-navigation/packaging/webpack.config.js`). Customize:
- **`externals`**: one entry per peer dep — `'@pkg/name': 'commonjs @pkg/name'`
- **`alias`**: one entry per stubbed `@kbn/*` package, e.g.:
  ```js
  '@kbn/i18n$': path.resolve(__dirname, 'react/services/i18n.tsx'),
  ```

#### `packaging/tsconfig.json`

Start from the side-navigation template. Update `paths` to match the alias map:
```json
{
  "paths": {
    "@kbn/some-dep": ["./react/services/some-dep.ts"]
  }
}
```
Update `include` to cover `../src/**/*.ts(x)` relative to the new package root.

#### `packaging/scripts/build.sh`

Copy verbatim from `src/platform/kbn-ui/side-navigation/packaging/scripts/build.sh`. Update only the top comment line to reference `{packageName}`. The path resolution is fully relative and generic — no other changes needed.

#### `packaging/react/index.tsx`

Re-export the main component under a distribution-friendly name alias. Always import from `../../src/` — never from the original source directory name. Derive component name, props type, and all re-exported types from the `index.ts` analysis in Phase 2:

```tsx
/*
 * [Elastic license header]
 */

// Build-time type validation
import './type_validation';

import React from 'react';
import { {SourceComponent}, type {SourceComponentProps} } from '../../src/{path-to-component}';
export type { /* all public types from ../../index.ts */ };

void React;

/** Alias for the external package. */
export type {ExportedComponentName}Props = {SourceComponentProps};

export const {ExportedComponentName} = (props: {ExportedComponentName}Props) => {
  return <{SourceComponent} {...props} />;
};
```

#### `packaging/react/types.ts`

Write standalone inline type definitions (no `@kbn/*` or `@elastic/eui` imports):
- Mirror every exported type from `index.ts`
- Replace complex EUI types (e.g. `IconType`) with `string`
- All types self-contained with only `import type * as React from 'react'` allowed
- End with `export declare function {ExportedComponentName}(props: ...): React.ReactNode;`

#### `packaging/react/type_validation.ts`

Follow the side-navigation pattern exactly:
- Import source types with `Source` prefix, packaged types with `Packaged` prefix
- Structural assignment checks: `const _foo: PackagedType = {} as SourceType;`
- Add `@ts-expect-error` for intentional simplifications (e.g. `IconType → string`)
- Export `export const TYPE_VALIDATION_PASSED = true;`

### 4e. Create packaging/example/ scaffold

```bash
mkdir -p src/platform/kbn-ui/{folderName}/packaging/example/src
mkdir -p src/platform/kbn-ui/{folderName}/packaging/example/public
```

The example is a minimal runnable app that imports from `../../target` (the built package), so consumers can see the component in action without a full Kibana setup.

**`packaging/example/package.json`** — replace `{folderName}`:
```json
{
  "name": "{folderName}-example",
  "version": "1.0.0",
  "private": true,
  "license": "SEE LICENSE IN LICENSE.txt",
  "description": "Example application demonstrating {ExportedComponentName} usage. Uses dependencies from Kibana root.",
  "scripts": {
    "start": "./start.sh"
  }
}
```

**`packaging/example/tsconfig.json`** — copy verbatim from side-navigation (it's fully generic).

**`packaging/example/webpack.config.js`** — copy from side-navigation, update only the alias:
```js
alias: {
  '{packageName}': path.resolve(__dirname, '../../target'),
},
```

**`packaging/example/start.sh`** — copy verbatim from side-navigation (fully relative, no substitution needed).

**`packaging/example/public/index.html`** — copy from side-navigation, update `<title>` to `{ExportedComponentName} Example`.

**`packaging/example/src/index.tsx`** — copy verbatim from side-navigation (generic React bootstrap).

**`packaging/example/src/app.tsx`** — generate a minimal working demo from the component's public API (derived from `packaging/react/types.ts` in step 4d):
- Wrap in `EuiProvider`
- Import the component and its required types from `'{packageName}'` (the webpack alias resolves to `../../target`)
- Initialise required props with realistic minimal values
- Wire up any callback props (e.g. `onChange`, `onItemClick`) with `useState` and display the current value
- Add an `<EuiText>` block listing manual test cases relevant to the component

**`packaging/example/README.md`** — copy from side-navigation, substituting `{packageName}` and `{folderName}`.

### 4f. Generate @kbn/* service stubs

For each `@kbn/*` package identified for stubbing in Phase 2:

**Known stubs** — copy directly from side-navigation:
- `@kbn/i18n` and `@kbn/i18n-react` → copy `src/platform/kbn-ui/side-navigation/packaging/react/services/i18n.tsx` verbatim

**Unknown stubs** — for each unfamiliar `@kbn/*` package:
1. Find and read its `index.ts` (search under `src/platform/packages/`) to list named exports
2. Create `packaging/react/services/{package-slug}.ts`:
   - Functions → `export const fnName = (..._args: unknown[]) => undefined as unknown as ReturnType;`
   - String constants → `export const CONST_NAME = '';`
   - Number constants → `export const CONST_NAME = 0;`
   - Boolean constants → `export const CONST_NAME = false;`
   - Object/array constants → `export const CONST_NAME = {};` / `[]`
   - Classes → minimal stub with constructor and required public methods
   - Types/interfaces → skip (compile-time only, no runtime representation)
3. Top comment: `// Stub for @kbn/{name} — no-op implementation for standalone bundle`

### 4g. Update all Kibana imports

Find and update every file importing the old package name:

```bash
# Collect affected files
grep -rl "from '${oldName}'" src/ x-pack/ packages/ --include="*.ts" --include="*.tsx"

# Replace static imports
find src/ x-pack/ packages/ -name "*.ts" -o -name "*.tsx" | \
  xargs grep -l "from '${oldName}'" | \
  xargs sed -i "s|from '${oldName}'|from '${packageName}'|g"

# Replace dynamic imports
find src/ x-pack/ packages/ -name "*.ts" -o -name "*.tsx" | \
  xargs grep -l "import('${oldName}')" | \
  xargs sed -i "s|import('${oldName}')|import('${packageName}')|g"
```

Also update `kbn_references` in `tsconfig.json` files:
```bash
grep -rl '"${oldName}"' src/ x-pack/ packages/ --include="tsconfig.json" | \
  xargs sed -i "s|\"${oldName}\"|\"${packageName}\"|g"
```

### 4h. Verify old location is gone

```bash
ls {sourcePath} 2>/dev/null && echo "ERROR: old path still exists" || echo "OK: old path removed"
```

Check for any remaining tsconfig.json composite project references to the old path:
```bash
grep -rl '{sourcePath}' . --include="tsconfig.json" | head -5
```
Remove any stale references found.

Remind the engineer:
- **Review `packaging/react/types.ts`** — EUI/complex type simplifications need manual verification
- **Review generated service stubs** — confirm no-op defaults are safe for the consumer context
- **Check BUILD.md and I18N.md** — copy from side-navigation as reference if the package needs them
- **Test the `.tgz` in the consumer app** (e.g. Cloud UI) before merging
