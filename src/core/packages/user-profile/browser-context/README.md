# @kbn/core-user-profile-browser-context

React context and provider for the current user (authenticated user + user profile).

This package is shipped via `kbn-ui-shared-deps-src` so all Webpack bundles
share the same React context instance — essential for the provider/consumer
pattern to work across plugin bundle boundaries. It is a private internal
bridge; plugins should use the `useCurrentUser` hook in
`@kbn/core-user-profile-browser-hooks` instead of importing from here directly.

## How the context reaches the tree

Core wires this up automatically:

1. `rendering.addContext(element)` (and the core UI render) wraps the tree in the
   rendering service context.
2. The rendering service wraps children in `CurrentUserProvider`, feeding it
   `coreStart.security.authc` and `coreStart.userProfile`.

Any component rendered via `rendering.addContext(...)` can therefore call
`useCurrentUser()` without any additional setup.

## Exports

- **`CurrentUserProvider`** — React provider that injects the Core services `useCurrentUser` needs.
- **`CurrentUserContext`** — the underlying React context (consumed by `useCurrentUser`).
