# @kbn/vitest

Kibana's Vitest preset, setup files, and runner. Unit tests are moving from Jest (`@kbn/jest`) to Vitest one package at a time; a migrated package replaces its `jest.config.js` with a `vitest.config.ts` that merges the node preset:

```ts
import { defineConfig, mergeConfig } from 'vitest/config';
import preset from '@kbn/vitest/node_preset';

export default mergeConfig(preset, defineConfig({ test: { root: import.meta.dirname } }));
```

- `node scripts/vitest` runs every migrated package (the root `vitest.config.ts` lists them as projects). Pass a path to filter, `--project <package id>` for one package, or `watch` to re-run on changes.
- `node scripts/check` runs the Vitest tests related to your changed files, and CI runs all of them in the "Vitest Tests" step.
- `node scripts/check_jest_configs` treats unit tests under a `vitest.config.ts` as covered; integration tests stay on Jest.
- Test files use the `vi` global. The preset maps `jest.fn()`/`jest.spyOn()` and friends to `vi` so shared `*-mocks` packages keep working, but `jest.mock()`/`jest.requireActual()` throw: write `vi.mock()`/`vi.importActual()`.
- `vi.mock()` can't intercept modules loaded with `require()`, and mocks called with `new` need a `function` implementation, not an arrow function.
- Test workers run with `--disallow-code-generation-from-strings`, the V8 flag Kibana runs with in production, so `eval()`, `new Function()` and the other function constructors throw. Jest only shims `eval` and `Function`, so a test that passed there can fail here; fix the code under test. Tests that need code generation on purpose stay on Jest for now. Vitest reads snapshot files with `new Function()`, so `patches/vitest@*.patch` makes it use `node:vm` instead; `src/disallow_code_generation.test.ts` fails if the flag or the patch goes missing.
