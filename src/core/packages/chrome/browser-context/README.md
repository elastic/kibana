# @kbn/core-chrome-browser-context

React context and provider for the Chrome service instance.

This package is shipped via `kbn-ui-shared-deps-src` so all Webpack bundles
share the same React context instance — essential for the provider/consumer
pattern to work across plugin bundle boundaries. It is a private internal
bridge; plugins should use the hooks in `@kbn/core-chrome-browser-hooks`
instead of importing from here directly.

## How the context reaches the tree

Core wires this up automatically:

1. `rendering.addContext(element)` wraps `element` in `KibanaRootContextProvider`
2. `KibanaRootContextProvider` calls `chrome.withProvider(children)`
3. `chrome.withProvider` renders `ChromeServiceProvider` around `children`

Any component rendered via `rendering.addContext(...)` can therefore use hooks
that call `useChromeService()` without any additional setup.

## Exports

- **`ChromeServiceProvider`** — React provider that injects the chrome instance into the tree.
- **`useChromeService`** — React hook that reads the chrome instance from context.
  Throws if called outside of a `ChromeServiceProvider`.
