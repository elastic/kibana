# Validation guidance

## Core rules

- Always run selective validation for touched code; do not run all tests.
- Pipe large test output to files so failures are searchable/replayable.
- Actually execute validation before finalizing work.

## Unit tests

```bash
yarn test:jest <path-to-test-file>
```

- If Jest prints `Jest did not exit one second after the test run has completed`, it's usually an open handles warning (unresolved timers, subscriptions). A passing exit code is still acceptable if the leak is unrelated to your change — document it in Additional Context.
- If actionable, rerun with `--detectOpenHandles` and fix the leak.
- Route-handler test pattern: extract business logic into testable functions, use dependency injection for external services (e.g. ES client), co-locate tests with source files.

### Jest gotchas

- `jest.mock('<module>', factory)` factories are hoisted and must not reference out-of-scope variables (including imported bindings like `React`). Use `jest.requireActual('react')` inside the factory.
- If using Jest fake timers, always restore real timers and clear pending timers in `afterEach`.
- Use deterministic test isolation and cleanup in setup/teardown.
- Ensure component tests unmount/close overlays and async work settles to avoid open handles.

## Lint and type-check

Run checks only for touched projects/packages:

```bash
# Lint
node scripts/eslint.js <touched-path> --fix

# Type-check (scoped to one project)
yarn test:type_check --project <touched-tsconfig-path>

# i18n (only when user-facing strings changed)
node scripts/i18n_check.js --fix
```

- Do not run repo-wide lint/type-check unless the task requires it.
- If scoped lint/type-check fails with dependency/project-map errors after switching branches, run `yarn kbn bootstrap` and retry.
- Type-check can take a while on larger projects. If it runs longer than expected, pipe output to a file and check periodically.

### Type-check caveats

- Scoped `yarn test:type_check --project <tsconfig>` can still fail due to referenced TS projects elsewhere in the repo. Treat as repo-level unless your task explicitly owns fixing those.
- Some bootstrap/type-check flows generate untracked `*.d.ts` artifacts (often under `src/platform/packages/shared/kbn-std/`). Don't include these in your changes unless your task is about generated types.
