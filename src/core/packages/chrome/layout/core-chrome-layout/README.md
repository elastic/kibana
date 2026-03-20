# @kbn/core-chrome-layout

Top-level layout wiring for Kibana's Chrome application shell. Bridges core services, chrome state, and chrome UI components into a renderable React tree.

## Responsibilities

- **Assembles `ChromeComponentsDeps`** from whole service contracts (`application`, `http`, `docLinks`, `customBranding`) and wraps the tree with `ChromeComponentsProvider`.
- **Selects the chrome layout** based on `useChromeStyle()` — renders `ClassicHeader` or `ProjectHeader` + `GridLayoutProjectSideNav` accordingly.
- **Composes the shell** — header, navigation, sidebar, banner, app menu bar, footer, and the application content area — into a CSS Grid layout via `ChromeLayout` from `@kbn/core-chrome-layout-components`.
- **Provides layout config** (`ChromeLayoutConfigProvider`) with dimensions (header height, banner height, sidebar width, etc.) consumed by layout components via CSS custom properties.

## Available Layouts

- **`GridLayout`** — modern CSS Grid-based layout (current default)

## Debug Mode

Set `core.chrome.layoutDebug: true` in your Kibana config to enable debug overlays for layout visualization.

## Related

- [`@kbn/core-chrome-browser-components`](../../browser-components) — all chrome UI components (headers, sidenav, etc.)
- [`@kbn/core-chrome-layout-components`](../core-chrome-layout-components) — `ChromeLayout` grid container and layout primitives
- [`@kbn/core-chrome-layout-feature-flags`](../core-chrome-layout-feature-flags) — feature flag utilities for debug mode
