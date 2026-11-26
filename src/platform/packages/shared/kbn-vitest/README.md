# @kbn/vitest

Kibana's Vitest presets, setup files, and runner. Unit tests are moving from Jest (`@kbn/jest`) to Vitest one package at a time; a migrated package replaces its `jest.config.js` with a `vitest.config.ts` that merges `node_preset` (for `@kbn/jest/jest_node`) or `jsdom_preset` (for `@kbn/jest`):

```ts
import { defineConfig, mergeConfig } from 'vitest/config';
import preset from '@kbn/vitest/node_preset';

export default mergeConfig(preset, defineConfig({ test: { root: import.meta.dirname } }));
```

- `node scripts/vitest` runs every migrated package (the root `vitest.config.ts` lists them as projects). Pass a path to filter, `--project <package id>` for one package, or `watch` to re-run on changes.
- `node scripts/check` runs the Vitest tests related to your changed files, and CI runs all of them in the "Vitest Tests" step.
- `node scripts/check_jest_configs` treats unit tests under a `vitest.config.ts` as covered; integration tests stay on Jest.
- Test files use the `vi` global. The presets map `jest.fn()`/`jest.spyOn()` and friends to `vi` so shared `*-mocks` packages keep working. In those non-test files, top-level `jest.mock()` statements are renamed to `vi.mock()` at transform time so they're hoisted, and `jest.requireActual()` is Node's `require` from the calling file. Anything else (`jest.doMock()`, nested `jest.mock()`, `jest.requireMock()`) throws: write `vi.*`.
- `vi.mock()` can't intercept modules loaded with `require()`, and mocks called with `new` need a `function` implementation, not an arrow function. `require()` of Kibana TypeScript packages goes through `@kbn/swc-register`.
- Both presets resolve and load modules like the Jest presets: `.peggy` grammars, raw `.txt`/`.html`/`.yaml`/`.text` imports, and asset stubs. `jsdom_preset` also compiles TS/JSX with the Jest SWC transformer (emotion labels, so snapshots match), maps `@elastic/eui` to its `test-env` build, resolves with `node` export conditions only, and runs the Jest setup: jest-dom matchers, RTL `data-test-subj`, enzyme with the same snapshot serializers, EUI and i18n mocks. Vitest puts jsdom's globals on Node's global object rather than running tests inside the jsdom window, so `src/setup/jsdom.js` switches fetch, URL, AbortController, events and typed arrays to the implementations Jest exposed, and clears timers left when a file finishes.
- Node preset workers run with `--disallow-code-generation-from-strings`, the V8 flag Kibana runs with in production, so `eval()`, `new Function()` and the other function constructors throw. Jest only shims `eval` and `Function`, so a test that passed there can fail here; fix the code under test. Tests that need code generation on purpose stay on Jest for now. Vitest reads snapshot files with `new Function()`, so `patches/vitest@*.patch` makes it use `node:vm` instead; `src/disallow_code_generation.test.ts` fails if the flag or the patch goes missing. jsdom compiles CSS selectors with `new Function()`, so `jsdom_preset` can't use the flag; `src/setup/disallow_code_generation.jsdom.js` guards `eval`/`Function` like Jest does, exempting only direct calls from jsdom's selector engine.

## Migrating a package

`node scripts/vitest_migrate <packageDir>` moves a package's unit tests from Jest to Vitest. It replaces `jest.config.js` with a `vitest.config.ts` (`@kbn/jest/jest_node` → `node_preset`, `@kbn/jest` → `jsdom_preset`), rewrites `jest.*` to `vi.*` in the tests and in package-local mocks and helpers, re-keys `.snap` files, and updates `tsconfig.json` and `moon.yml`. Integration tests keep their `jest.integration.config.js`. Configs with options beyond `preset`, `rootDir`, `roots` and coverage settings are refused.

It prints what it could not rewrite as `file:line reason`, e.g. inline error snapshots (regenerate them with `node scripts/vitest <file> -u`), constructor mocks it could not detect, and mocks exported to other packages. Pass `--dry-run` to only see the report, `--files <file...>` to run just the code rewrite, and `--compare-snapshots [--base <ref>] <file.snap...>` to check that snapshots only changed their key format.
