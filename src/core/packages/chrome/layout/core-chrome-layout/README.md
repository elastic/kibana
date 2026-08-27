# @kbn/core-chrome-layout

Top-level layout wiring for Kibana's Chrome application shell. Bridges core services, chrome state, and chrome UI components into a renderable React tree.

## Responsibilities

- **Assembles `ChromeComponentsDeps`** from whole service contracts (`application`, `http`, `docLinks`, `customBranding`) and wraps the tree with `ChromeComponentsProvider`.
- **Selects the chrome layout** based on `useChromeStyle()` — renders `ClassicHeader` or `ChromeNextGlobalHeader` + `GridLayoutProjectSideNav` accordingly.
- **Maps Kibana chrome style** (`classic` / `project`) to the host-neutral layout appearance (`plain` / `framed`).
- **Composes the shell** — header, navigation, sidebar, banner, chrome-owned app header, footer, and the application content area — into a CSS Grid layout via `ChromeLayout` from `@kbn/ui-chrome-layout`.
- **Applies Kibana integration styles** for legacy variables, application wrappers, and the fixed chart viewport around the reusable layout (`KibanaGridLayoutGlobalStyles`).
- **Provides layout config** (`ChromeLayoutConfigProvider`) with dimensions (header height, banner height, sidebar width, etc.) consumed by layout components via CSS custom properties.
- **Re-exports layout constants and utilities** (`layoutVar`, `APP_MAIN_SCROLL_CONTAINER_ID`, scroll helpers, and Kibana-only IDs such as `APP_FIXED_VIEWPORT_ID`) as the Kibana plugin API.

## Available Layouts

- **`GridLayout`** — modern CSS Grid-based layout (current default)

## Related

- [`@kbn/core-chrome-browser-components`](../../browser-components) — all chrome UI components (headers, sidenav, etc.)
- [`@kbn/ui-chrome-layout`](../../../../platform/kbn-ui/chrome-layout) — `ChromeLayout` grid container and layout primitives
