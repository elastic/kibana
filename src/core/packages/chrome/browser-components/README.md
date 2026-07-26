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
| `ChromeComponentsDeps` | External-service deps (`application`, `http`, `docLinks`, `customBranding`) passed to `ChromeComponentsProvider` — assembled by the layout layer using `Pick` from service interfaces |
| `ChromeComponentsProvider` | Context provider; wrap the layout tree once with the assembled `ChromeComponentsDeps` |
| `ClassicHeader` | Classic header; self-hydrates from context |
| `ProjectHeader` | Project header; self-hydrates from context |
| `GridLayoutProjectSideNav` | Project side-navigation for grid layout; self-hydrates from context |
| `ChromelessHeader` | Chromeless loading bar; self-hydrates from context |
| `HeaderTopBanner` | Top banner; self-hydrates from context |
| `AppMenuBar` | Project app menu bar; self-hydrates from context |
| `Sidebar` | Sidebar wrapper |
| `useHasAppMenu` | Whether an app menu (legacy or new) is active |
| `HeaderBreadcrumbsBadges` | Breadcrumb badge renderer, used by `browser-internal` state |

## Context architecture

- **`ChromeComponentsDeps`** contains 4 service-contract fields (`application`, `http`, `docLinks`, `customBranding`), each narrowed via `Pick` from their canonical service interface. The layout layer passes whole service objects and wraps the tree via `ChromeComponentsProvider`.
- **Chrome-owned state** (breadcrumbs, nav controls, help menu, etc.) is accessed directly via `useChromeService()` hooks — not through `ChromeComponentsDeps`.
- **Only hooks** (in `chrome_hooks.ts` and `header_action_menu.tsx`) call `useChromeComponentsDeps()`. Components use dedicated hooks like `useBasePath()`, `useNavigateToApp()`, `useCustomBranding()` etc.

## Internal vs public hooks boundary

- Internal (`@kbn/core-chrome-browser-components`): hooks in `chrome_hooks.ts` read from `useChromeComponentsDeps()`; components use those hooks.
- Service context (`@kbn/core-chrome-browser-context`, private): `ChromeServiceProvider` + `useChromeService`.
- Public (`@kbn/core-chrome-browser-hooks`, shared): plugin-safe hooks built on `ChromeStart` (`useChromeStyle`, `useActiveSolutionNavId`, `useHasHeaderBanner`).

Rule of thumb: if a hook depends on `ChromeComponentsDeps`, keep it internal; if it can be expressed via `ChromeStart`, expose it from `browser-hooks`.
