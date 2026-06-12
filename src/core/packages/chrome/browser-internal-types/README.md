# @kbn/core-chrome-browser-internal-types

Internal type definitions for the Chrome service: `InternalChromeSetup` and `InternalChromeStart`.

`InternalChromeStart` extends the public `ChromeStart` with internal-only APIs consumed by chrome UI components (e.g. `getBadge$()`, `getHeaderBanner$()`, `getBreadcrumbsAppendExtensionsWithBadges$()`, `project.*`). Plugins should use `ChromeStart` from `@kbn/core-chrome-browser` instead.

Extracted into a standalone leaf package (single dep: `@kbn/core-chrome-browser`) so that lightweight consumers (`browser-context`, `browser-mocks`, `browser-components`) can reference these types without depending on `@kbn/core-chrome-browser-internal` — avoiding circular dependency chains.

## Exports

| Export | Description |
|---|---|
| `InternalChromeSetup` | Type alias for `ChromeSetup` (reserved for future internal extensions) |
| `InternalChromeStart` | Extends `ChromeStart` with internal observable APIs and `project` sub-API |
