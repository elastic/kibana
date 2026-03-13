# Lessons learned

Guidance distilled from repeated agent runs. Read before implementing changes.

## Diff scope and verification

- Use `git diff` to check working-tree edits before finalizing.
- Run `git diff --check` to catch whitespace/conflict artifacts.
- Stage files selectively — avoid `git add .` when untracked generated artifacts exist.

## API and UI robustness

- Prefer explicit API state fields over brittle error-string matching.
- When wrapping/aggregating downstream errors, preserve useful HTTP status codes (don't convert actionable 404s into 500s).
- For editor-like inputs, propagate validity explicitly (e.g. `onValidityChange`).
- When combining debounced editor updates with blur/unmount "flush", add a dirty guard so blur doesn't trigger redundant writes.
- Test the state transition that often regresses: valid -> invalid (save disabled) -> valid (save enabled).

## Test reliability

- Use deterministic test isolation and cleanup in setup/teardown.
- Ensure component tests unmount/close overlays and async work settles.
- If using Jest fake timers, always restore real timers and clear pending timers in `afterEach`.
- `jest.mock()` factories are hoisted — use `jest.requireActual()` inside the factory for out-of-scope modules.
- Keep locator strategies strict and unambiguous in browser tests.
- For async "don't render until first response" behaviors, gate/release the first request deterministically in tests.

## Multi-item failure fixes

- When CI fails on multiple items, enumerate ALL failing items first before implementing any fix.
- Apply the fix to all affected items in a single pass to avoid multiple follow-up commits.
- If the error says "N failures", verify you found N items in your list.

## Kibana-specific

### Package boundaries and imports
- Avoid `@kbn/<pkg>/src/...` subpath imports. Use public package entrypoints only.

### Type-check and bootstrap
- If type-check/eslint reports TS project map/ref issues after branch changes, run `yarn kbn bootstrap`.
- Bootstrap and type-check flows may create untracked generated artifacts (`*.d.ts`) — don't commit unrelated noise.
- Prefer scoped checks for touched projects/packages over global checks.

### ES client mocks and types
- `mockResponseImplementationOnce()` handlers should return transport-like results (`{ body: ... }` shape).
- Use `mockResponseOnce(...)` for response body directly in non-meta calls.
- For `esClient.transport.request(...)` calls that infer `unknown`, pass explicit generic response types.

### Webpack optimizer and `extraPublicDirs`
- When a plugin declares `"extraPublicDirs": ["common"]`, imports from that path require the source plugin in `requiredPlugins` or `requiredBundles`.
- Even `import type` statements can trigger this.
- `requiredPlugins` = runtime plugin deps, `requiredBundles` = bundle-level deps, `optionalPlugins` won't satisfy bundle requirements.
- Before adding `requiredBundles`, verify the plugin actually imports from that bundle in its public code path.

### XState v5 typing gotchas
- Prefer stubbing via `someMachine.provide({ actors: { ... } })` so the resulting machine stays assignable.
- When testing machines with `after: { <ms>: ... }` transitions and fake timers, use `await jest.advanceTimersByTimeAsync(0)` for a flush tick.
- For TS4023/TS7056 type-serialization errors with `setup()`, wrap in an IIFE.

### React hooks deps
- If a hook should react only to mapping-affecting changes (not metadata-only edits like `description`), derive a stable key from the mapping-affecting subset and depend on that.
- Memoize config objects using that stable key so object identity stays stable.

### Shell patterns
- Use heredocs for multi-line message bodies to avoid escaping bugs and backtick interpolation.
- Quote wildcard-like refs/patterns in zsh to avoid "no matches found" failures.
