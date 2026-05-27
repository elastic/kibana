# ES|QL Monaco providers

This folder contains Monaco language providers used by ES|QL (suggestions, hover, code actions, validation, and more).

## How providers work

Each provider follows the same pattern:

1. Monaco calls a provider entry point like `provideCompletionItems` or `provideHover`.
2. The provider calls `createMonacoProvider({ model, run, emptyResult })`.
3. `createMonacoProvider` executes `run` with a proxied model called `safeModel`.
4. If the editor model is disposed while async work is running, the factory returns `emptyResult` instead of crashing.

In practice:

- `run` contains provider-specific logic (read text, compute cursor offset, call ES|QL helpers implemented in `kbn-esql-language`, format output).
- `emptyResult` is the safe fallback expected by Monaco for that provider type.
  - suggestions: `{ suggestions: [] }`
  - hover: `null`
  - code actions: `{ actions: [], dispose: () => {} }` (or equivalent empty shape)

## Why `safeModel` exists

Monaco providers are often async. While a provider is still computing, the user can move away from the editor view or switch state, and Monaco may dispose the model.

Accessing a disposed model normally throws at runtime. `safeModel` protects us from that by:

- throwing a controlled `DisposedModelAccessError` on unsafe access,
- letting `createMonacoProvider` catch that error,
- returning `emptyResult` cleanly.

This avoids flaky errors and keeps the UI stable.

Inside the `run` callback:

- Use `safeModel` for all model reads and calls (`getValue()`, `getWordAtPosition()`, `getLineCount()`, etc.).
- Keep `model` only for equality checks (for example comparing editors with `editor.getModel() === model`).

## Quick checklist for new providers

- Wrap logic with `createMonacoProvider`.
- Pick the correct `emptyResult` for the provider API.
- Use `safeModel` in `run` for every model access (except comparisons).
- Avoid leaking Monaco implementation details or interfaces into `kbn-esql-language` implementations, those should reamain agnostic to the used library.
