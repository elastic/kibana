# @kbn/core-chrome-browser-internal-types

Internal type definitions for the Chrome service (`InternalChromeStart`, `InternalChromeSetup`, `ChromeComponentsConfig`).

Extracted into a standalone package so that lightweight consumers (e.g.
`@kbn/core-chrome-browser-context`, `@kbn/core-chrome-browser-components`)
can reference these types without depending on
`@kbn/core-chrome-browser-internal` — avoiding circular dependency chains.
