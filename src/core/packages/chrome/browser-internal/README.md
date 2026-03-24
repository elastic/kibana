# @kbn/core-chrome-browser-internal

Implementation of Core's browser-side Chrome service.

## Responsibilities

- **`ChromeService`** — lifecycle class (`setup` / `start` / `stop`) that wires up all chrome subsystems and returns the `InternalChromeStart` contract.
- **State management** — observable state for breadcrumbs, badges, nav links, nav controls, help menu, header banner, doc title, project navigation, and more. State is managed in `src/state/` and `src/services/`.
- **`createChromeApi`** — factory that assembles the public `ChromeStart` / internal `InternalChromeStart` API surface from the individual state slices.
- **`ChromeServiceProvider` wiring** — `start()` returns a `withProvider(children)` function that wraps the React tree with `ChromeServiceProvider` from `@kbn/core-chrome-browser-context`.

## What does NOT live here

UI components (headers, sidenav, loading indicator, breadcrumbs, etc.) live in `@kbn/core-chrome-browser-components`. This package is purely state and API — no React rendering.
