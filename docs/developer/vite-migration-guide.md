# Kibana Vite Migration Guide

This guide documents the migration from webpack/Jest to Vite/Vitest for the Kibana codebase.

## Overview

Kibana is migrating its build toolchain to modernize the development experience:

- **Build System**: webpack → Vite
- **Test Framework**: Jest → Vitest

This migration provides:

- Faster development builds with native ES modules
- Faster HMR (Hot Module Replacement)
- Better test performance
- Modern tooling with excellent TypeScript support

## New Packages

### @kbn/vite-config

Shared Vite configuration for Kibana packages.

```typescript
import { createKbnViteConfig, createKbnBrowserConfig, createKbnNodeConfig } from '@kbn/vite-config';
```

Key exports:

- `createKbnViteConfig()` - Base configuration factory
- `createKbnBrowserConfig()` - Browser-targeted builds
- `createKbnNodeConfig()` - Node.js-targeted builds
- `kbnResolverPlugin()` - Resolves @kbn/\* packages
- `kbnPeggyPlugin()` - Compiles .peggy grammar files
- `kbnStylesPlugin()` - Handles SCSS with theme support
- `kbnBundleRemotesPlugin()` - Cross-bundle import handling

### @kbn/vitest

Shared Vitest configuration for Kibana packages.

```typescript
import {
  createKbnVitestPreset,
  createKbnUnitTestPreset,
  createKbnIntegrationTestPreset,
} from '@kbn/vitest';
```

Key exports:

- `createKbnVitestPreset()` - Base test configuration
- `createKbnUnitTestPreset()` - Unit test configuration
- `createKbnIntegrationTestPreset()` - Integration test configuration
- Mock modules (styleMock, fileMock, workerMock, etc.)

### @kbn/vitest-codemod

Automated migration tool for converting Jest tests to Vitest.

```bash
# Analyze what would change
node packages/kbn-vitest-codemod/cli.ts --analyze <path>

# Apply transformations
node packages/kbn-vitest-codemod/cli.ts <path>
```

## Migrating a Package

### Step 1: Add Vite Configuration

Create `vite.config.ts` in your package:

```typescript
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { createKbnNodeConfig } from '@kbn/vite-config';

const REPO_ROOT = resolve(__dirname, '../../..');

export default defineConfig(
  createKbnNodeConfig({
    repoRoot: REPO_ROOT,
    packageRoot: __dirname,
    entry: './index.ts',
  })
);
```

### Step 2: Add Vitest Configuration

Create `vitest.config.ts` in your package:

```typescript
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';
import { createKbnUnitTestPreset } from '@kbn/vitest';

const REPO_ROOT = resolve(__dirname, '../../..');

export default defineConfig(
  createKbnUnitTestPreset({
    repoRoot: REPO_ROOT,
    packageRoot: __dirname,
  })
);
```

### Step 3: Migrate Tests

Run the codemod to convert Jest syntax to Vitest:

```bash
node packages/kbn-vitest-codemod/cli.ts --dry-run <your-package-path>
node packages/kbn-vitest-codemod/cli.ts <your-package-path>
```

### Step 4: Run Tests

```bash
# Run with Vitest
npx vitest run

# Run with Jest (until fully migrated)
yarn test:jest <your-package-path>
```

### Step 5: Validate Build

```bash
npx vite build
```

## Migration Checklist for Each Package

- [ ] Create `vite.config.ts`
- [ ] Create `vitest.config.ts`
- [ ] Run codemod on test files
- [ ] Manually review transformed tests
- [ ] Run Vitest and fix any failures
- [ ] Run Vite build and compare output
- [ ] Update documentation if needed

## Jest to Vitest Conversion Reference

| Jest                                   | Vitest                        |
| -------------------------------------- | ----------------------------- |
| `jest.fn()`                            | `vi.fn()`                     |
| `jest.mock()`                          | `vi.mock()`                   |
| `jest.spyOn()`                         | `vi.spyOn()`                  |
| `jest.clearAllMocks()`                 | `vi.clearAllMocks()`          |
| `jest.useFakeTimers()`                 | `vi.useFakeTimers()`          |
| `jest.requireActual()`                 | `vi.importActual()` (async)   |
| `import { jest } from '@jest/globals'` | `import { vi } from 'vitest'` |

## Running Tests in CI

During the migration, both Jest and Vitest run in CI:

```bash
# Jest (existing)
yarn test:jest

# Vitest (new)
node scripts/vitest.js
```

CI configuration is in:

- `.buildkite/scripts/steps/test/jest.sh` (Jest)
- `.buildkite/scripts/steps/test/vitest.sh` (Vitest)

## Package Migration Order

Migrate packages in this order (dependencies first):

1. **Leaf packages** (no internal dependencies)

   - `@kbn/interpreter`
   - `@kbn/std`
   - `@kbn/utility-types`

2. **Shared utilities**

   - `@kbn/i18n`
   - `@kbn/config-schema`

3. **Core packages**

   - `@kbn/core-*`

4. **Plugin packages**
   - Start with smaller plugins
   - Progress to larger ones

## Troubleshooting

### Import Resolution Issues

If `@kbn/*` imports aren't resolving:

1. Ensure the package map is up-to-date: `yarn kbn bootstrap`
2. Check that `kbnResolverPlugin` is in your Vite config

### Peggy Grammar Files

If `.peggy` files aren't compiling:

1. Add `kbnPeggyPlugin()` to your Vite config
2. Ensure `peggy` is installed: `yarn add -D peggy`

### Mock Not Working

If mocks aren't being applied:

1. Vitest hoists `vi.mock()` calls, but the syntax is slightly different
2. Check for async mock factories that need `vi.importActual()`

### SCSS/CSS Issues

If styles aren't being processed:

1. Add `kbnStylesPlugin()` to your Vite config
2. Check theme imports are using the correct query parameters

## Future Work

### Plugin Builds

The `@kbn/optimizer` replacement is still in progress. Currently:

- Package builds use Vite
- Plugin bundles still use webpack

### Dev Server

The Vite dev server integration with `@kbn/cli-dev-mode` is planned.

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [@kbn/vite-config README](../packages/kbn-vite-config/README.mdx)
- [@kbn/vitest README](../packages/kbn-vitest/README.mdx)
