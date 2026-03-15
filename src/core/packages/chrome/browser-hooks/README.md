# @kbn/core-chrome-browser-hooks

Shared React hooks over the Chrome observable APIs.

## Prerequisites

These hooks require `ChromeServiceProvider` to be present in the React tree.
Core sets this up automatically — any component rendered via
`rendering.addContext(element)` has access to all hooks in this package.

## Entry points

### Public (`@kbn/core-chrome-browser-hooks`)

For use by plugins and any code outside core Chrome internals:

- `useChromeStyle()` — returns the current `ChromeStyle` (`'classic'` or `'project'`). Defaults to `'classic'` until explicitly changed.
- `useActiveSolutionNavId()` — returns the active solution nav ID, or `null` when no solution nav is active.
- `useIsChromeVisible()` — returns `true` when the chrome UI (header and navigation) is currently visible.
- `useSidebarWidth()` — returns the effective sidebar pixel width (`0` when the sidebar is closed).

### Internal (`@kbn/core-chrome-browser-hooks/internal`)

For use by core Chrome components only (e.g. layout, grid). Not part of the public API:

- `useGlobalFooter()` — returns the current global footer `ReactNode` (used by the developer toolbar).
- `useHasHeaderBanner()` — returns `true` when a header banner is currently registered via `chrome.setHeaderBanner()`.

## Notes

Hooks intentionally do not take caller-provided default values.
They seed state from synchronous Chrome getters to match current chrome state
before subscribing to observables.

All hooks consume `useChromeService()` from `@kbn/core-chrome-browser-context`,
which returns `InternalChromeStart` — the full internal chrome API injected by core
through `chrome.withProvider(...)`. Public hooks only use the `ChromeStart` subset;
internal hooks may access internal-only APIs such as `componentDeps` and `getGlobalFooter$()`.
