# @kbn/core-chrome-browser-components

UI components for the Kibana Chrome shell. Extracted from `@kbn/core-chrome-browser-internal` to separate rendering from state management.

## Structure

```
src/
  context.tsx             ChromeComponentsDeps type + ChromeComponentsProvider / useChromeComponentsDeps
  classic/                Two-row classic header and its exclusive sub-components
  project/                Project-layout header, breadcrumbs, app menu, sidenav
  shared/                 Components used by both classic and project (nav controls, help menu, etc.)
  sidebar/                Chrome-level sidebar wrapper
```

## Public API

| Export | Description |
|---|---|
| `ChromeComponentsDeps` | External-service deps passed to `ChromeComponentsProvider` — assembled by the layout layer |
| `ChromeApplicationContext` | Minimal application contract used inside `ChromeComponentsDeps`; replaces `InternalApplicationStart` to break the private-package dependency |
| `ChromeComponentsProvider` | Context provider; wrap the layout tree once with the assembled `ChromeComponentsDeps` |
| `useChromeComponentsDeps` | Hook to read `ChromeComponentsDeps` from context (use inside provider) |
| `ClassicHeader` | Classic header; self-hydrates from context |
| `ProjectHeader` | Project header; self-hydrates from context |
| `GridLayoutProjectSideNav` | Project side-navigation for grid layout; self-hydrates from context |
| `ChromelessHeader` | Chromeless loading bar; self-hydrates from context |
| `HeaderTopBanner` | Top banner; self-hydrates from context |
| `AppMenuBar` | Project app menu bar; self-hydrates from context |
| `Sidebar` | Sidebar wrapper |
| `LoadingIndicator` | Horizontal/bar loading indicator |
| `HeaderBreadcrumbsBadges` | Breadcrumb badge renderer, used by `browser-internal` state |

## Context architecture

- **`ChromeComponentsDeps`** contains only 5 external-service fields (`application`, `basePath`, `docLinks`, `loadingCount$`, `customBranding$`). The layout layer assembles these and wraps the tree via `ChromeComponentsProvider`.
- **Chrome-owned state** (breadcrumbs, nav controls, help menu, etc.) is accessed directly via `useChromeService()` hooks — not through `ChromeComponentsDeps`.

## Internal vs public hooks boundary

- Internal (`@kbn/core-chrome-browser-components`): component wiring uses `ChromeComponentsDeps` and `useChromeComponentsDeps`.
- Service context (`@kbn/core-chrome-browser-context`, private): `ChromeServiceProvider` + `useChromeService`.
- Public (`@kbn/core-chrome-browser-hooks`, shared): plugin-safe hooks built on `ChromeStart` (`useChromeStyle`, `useActiveSolutionNavId`, `useHasHeaderBanner`).

Rule of thumb: if a hook depends on `ChromeComponentsDeps`, keep it internal; if it can be expressed via `ChromeStart`, expose it from `browser-hooks`.
