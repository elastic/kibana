# DTS Bundle Generator Experiment

## Executive Summary

This document summarizes an experiment using `dts-bundle-generator` to create consolidated TypeScript declaration files for Kibana plugin public APIs. The goal is to evaluate whether this approach can help reduce circular dependencies and replace manually-managed type definitions for plugins.

The purpose of this experiment was to evaluate a bundled type file to reduce circular dependencies and/or standardize plugin contract types.  **It is not a proposal for production**.  There are other options for bundling, points to consider and discuss, etc.  Think of it as starting a conversation.

## Quick Start

A helper script automates the configuration and generation process:

```bash
# Analyze a plugin and create config files
node scripts/generate_plugin_types.js expressions

# Generate the bundled .d.ts files
node scripts/generate_plugin_types.js expressions --generate

# Analyze server target only and update its config
node scripts/generate_plugin_types.js expressions --server --update
```

---

## What We Did

### Initial Setup

We configured `dts-bundle-generator` to generate bundled declaration files from plugin entry points. The experiment evolved from manual configuration to a fully automated script.

### Current Workflow

1. **Run the analysis script** to scan source files and create/update configuration:
   ```bash
   node scripts/generate_plugin_types.js <plugin-name>
   ```

2. **Generate the `.d.ts` files**:
   ```bash
   node scripts/generate_plugin_types.js <plugin-name> --generate
   ```

3. **Output files** are created in the plugin's `types/` directory:
   - `types/plugin_public.d.ts` - Public API types
   - `types/plugin_server.d.ts` - Server API types

### Configuration Files

The script creates these files in `<plugin>/types/`:

**`generate_public.json`** / **`generate_server.json`** - Main configuration specifying:
- Entry point: `../public/plugin.ts` or `../server/plugin.ts`
- Output: `./plugin_public.d.ts` or `./plugin_server.d.ts`
- Externalized libraries (npm packages, `@elastic/*`)
- `exportReferencedTypes: false` to avoid name collisions
- `noBanner: true` to allow custom license header

**`tsconfig.bundle.json`** - TypeScript configuration with:
- `noEmit: true` to prevent overwriting source files
- `skipLibCheck: true` for faster compilation
- `declaration: true` for type generation

---

## The Helper Script

### Location

- **Script:** `scripts/generate_plugin_types.js`
- **Implementation:** `src/dev/plugin_types/generate_plugin_types.ts`

### Usage

```bash
node scripts/generate_plugin_types.js <plugin-name-or-path> [options]
```

### Options

| Flag | Description |
|------|-------------|
| `--public` | Target `public/plugin.ts` only |
| `--server` | Target `server/plugin.ts` only |
| `--update` | Update config's `importedLibraries` with recommendations |
| `--generate` | Run `dts-bundle-generator` and add license header |

By default (no `--public` or `--server`), both targets are analyzed/generated if their entry files exist.

### Examples

```bash
# Analyze both public and server for expressions plugin
node scripts/generate_plugin_types.js expressions

# Analyze only public target
node scripts/generate_plugin_types.js expressions --public

# Generate types for both targets
node scripts/generate_plugin_types.js expressions --generate

# Generate types for server only
node scripts/generate_plugin_types.js expressions --server --generate

# Update config with recommended libraries
node scripts/generate_plugin_types.js expressions --update

# Use explicit path instead of plugin name
node scripts/generate_plugin_types.js src/platform/plugins/shared/expressions
```

### What the Script Does

1. **Resolves the plugin path** from the name (searches known plugin directories)
2. **Creates `types/` directory** if it doesn't exist
3. **Creates/updates `tsconfig.bundle.json`** with proper settings
4. **Scans source files** in `public/`, `server/`, and `common/` directories
5. **Extracts imports** to identify dependencies
6. **Categorizes packages** (npm, `@elastic/*`, `@kbn/*`, Node.js builtins, test packages)
7. **Creates config files** with recommended `importedLibraries`
8. **Generates `.d.ts` files** when `--generate` is specified
9. **Adds license header** to generated files

### Default Imported Libraries

The script includes default transitive dependencies that are commonly needed:

**Common (both public and server):**
- `@elastic/ebt`, `@elastic/ecs`, `@elastic/eui`, `@elastic/transport`
- `@openfeature/core`, `inversify`, `joi`, `moment`, `openapi-types`, `rxjs`
- Node.js: `events`, `http`, `tls`

**Public-specific:**
- `@openfeature/web-sdk`, `history`, `react`, `react-dom`, `react-router-dom`

**Server-specific:**
- `@elastic/elasticsearch`, `@hapi/boom`, `@hapi/hapi`, `@openfeature/server-sdk`
- `elastic-apm-node`, `lodash`, `perf_hooks`, `stream`

---

## Bugs Fixed Along the Way

### 1. Missing Type Declarations for JS-Only Packages

**Problem:** Several `@kbn/*` packages are JavaScript-only and lack `.d.ts` files, causing `dts-bundle-generator` to fail with "Cannot find symbol" errors.

**Files affected:**
- `@kbn/repo-packages`
- `@kbn/repo-info`
- `@kbn/ui-shared-deps-npm`
- `@kbn/interpreter`

**Solution:** Created `.d.ts` files for these packages:
- `src/platform/packages/private/kbn-repo-packages/index.d.ts`
- `src/platform/packages/private/kbn-repo-packages/modern/package.d.ts`
- `src/platform/packages/private/kbn-repo-packages/modern/parse_helpers.d.ts`
- `src/platform/packages/private/kbn-repo-packages/modern/plugin_category_info.d.ts`
- `src/platform/packages/shared/kbn-repo-info/index.d.ts`
- `src/platform/packages/private/kbn-ui-shared-deps-npm/index.d.ts`
- Various files in `kbn-interpreter`

### 2. Incorrect Return Types in Package Declarations

**Problem:** `getPackages()` and related functions were incorrectly declared as async (`Promise<Package[]>`) when they're actually synchronous.

**File:** `src/platform/packages/private/kbn-repo-packages/index.d.ts`

**Fix:** Changed return types from `Promise<T>` to `T` for synchronous functions.

### 3. Missing `ParserTracer` Type in Ambient Declarations

**Problem:** `kbn-ambient-common-types/index.d.ts` referenced `ParserTracer` from peggy without importing it.

**File:** `src/platform/packages/private/kbn-ambient-common-types/index.d.ts`

**Fix:** Added `import type { ParserTracer } from 'peggy';` inside the `declare module '*.peggy'` block.

### 4. Typo in Ambient UI Types

**Problem:** Two module declarations exported `string` (the type keyword) instead of `content` (the variable).

**File:** `src/platform/packages/shared/kbn-ambient-ui-types/index.d.ts`

**Fix:** Changed `export default string;` to `export default content;` for `*?asUrl` and `*?raw` modules.

### 5. Monaco Language Module Declarations

**Problem:** Monaco editor basic language modules (`css/css`, `markdown/markdown`, `yaml/yaml`) lacked type declarations.

**Solution:** Added module declarations to `kbn-ambient-ui-types/index.d.ts` with proper `LanguageConfiguration` and `IMonarchLanguage` exports.

### 6. APM RUM Core Missing Types

**Problem:** `@elastic/apm-rum-core` doesn't ship with TypeScript declarations.

**Solution:** Created `typings/@elastic/apm-rum-core/index.d.ts` with declarations for `afterFrame` and `AfterFrameCallback`.

---

## Known Limitations / Remaining Issues

### 1. Import Alias Resolution Bug in dts-bundle-generator

**Problem:** When source code uses `import { Reference as InternalReference } from 'joi'`, the bundler outputs `Joi.InternalReference` instead of `Joi.Reference`.

**Status:** This appears to be a bug/limitation in dts-bundle-generator. No upstream fix found.

**Workaround:** Use `--no-check` flag to skip validation, or rename aliases to match original export names.

### 2. EUI Type Declaration Errors

**Problem:** `@elastic/eui/eui.d.ts` has internal errors referencing `@storybook/csf`, `@cypress/react18`, and relative paths that don't exist.

**Status:** This is an issue in EUI's published types, not our code.

**Workaround:** Use `--no-check` or `skipLibCheck: true`.

### 3. Duplicate Import Statements

**Problem:** The bundler sometimes generates conflicting imports like:
```typescript
import * as Joi from 'joi';
import Joi from 'joi';
import { Schema } from 'joi';
```

**Workaround:** Use `--no-check` or post-process the generated file.

### 4. `@kbn/*` Packages Are Always Inlined

**Problem:** Even when `@kbn/*` packages are listed in `importedLibraries`, their types are inlined because they're resolved locally via path mappings.

**Status:** This is by design in `dts-bundle-generator` - it only externalizes packages resolved from `node_modules`.

**Impact:** Generated files include all `@kbn/*` types, increasing file size but ensuring complete type coverage.

---

## Effectiveness Analysis

### Generated File Statistics (expressions plugin)

| Target | Lines | External Imports |
|--------|-------|------------------|
| `plugin_public.d.ts` | ~6,080 | 18 packages |
| `plugin_server.d.ts` | ~10,816 | 21 packages |

### Will This Reduce Circular Dependencies?

**Potentially, yes.** The bundled declaration file:

1. **Flattens the type graph**: All types are declared in a single file, eliminating import cycles between type files.

2. **Externalizes stable dependencies**: By importing from `rxjs`, `@elastic/eui`, and other stable packages rather than inlining their types, consumers don't need to resolve deep dependency chains.

3. **Clear API boundary**: The single file represents the complete public API contract, making it easier to detect unintended type exports.

**However, there are caveats:**

- The generated file still transitively includes types from many `@kbn/*` packages (core services, utilities, etc.).
- True circular dependency resolution requires careful design of what's exported, not just bundling.
- Runtime circular dependencies (actual code) are unaffected by type bundling.

### Can We Replace Manually-Managed Plugin Types?

**Partially.** This approach could replace:

1. ✅ **Handwritten `.d.ts` files** that duplicate plugin interfaces
2. ✅ **Barrel exports** (`index.ts` files that re-export types)
3. ✅ **Type-only packages** created solely to share interfaces between plugins

**But it cannot replace:**

1. ❌ **Runtime type guards** and validators
2. ❌ **Generic type utilities** that need to be imported and specialized
3. ❌ **Types tightly coupled to implementation** (these should stay with the code)

### Recommended Use Cases

| Use Case | Recommendation |
|----------|----------------|
| Cross-plugin type sharing | ✅ Good fit - generates stable contract |
| Plugin SDK for external consumers | ✅ Excellent fit - single file distribution |
| Internal monorepo types | ⚠️ Mixed - may over-inline internal types |
| Complex generic types | ❌ Poor fit - bundler may not preserve generics correctly |

---

## Next Steps

1. ✅ ~~Create automated script for analysis~~ - Done: `generate_plugin_types.js`
2. ✅ ~~Support both public and server targets~~ - Done
3. ✅ ~~Add license headers to generated files~~ - Done
4. **Test with simpler plugins** to validate approach
5. Evaluate impact on testing, development, (especially not inlining @kbn/* packages)
6. Evaluate `api-extractor`, `tsup`.

---

*Last Updated: January 2026*
