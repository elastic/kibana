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
| `ChromeComponentsDeps` | Deps passed to `ChromeComponentsProvider` — single contract between `ChromeService` and the layout |
| `ChromeApplicationContext` | Minimal application contract used inside `ChromeComponentsDeps`; replaces `InternalApplicationStart` to break the private-package dependency |
| `ChromeComponentsProvider` | Context provider; wrap the layout tree once with `chrome.componentDeps` |
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

## Note: `ChromeComponentsProvider` is a stepping stone

`ChromeComponentsProvider` / `useChromeComponentsDeps` are **temporary**. They exist as an intermediate step toward a proper `ChromeStateProvider` in a dedicated package that exposes React hooks (`useChromeStyle`, `useChromeBreadcrumbs`, etc.) so components are fully decoupled from Observable props. Once `ChromeStateProvider` exists this provider can be replaced.

Progress is tracked in the Chrome & Grid Evolution epic: kibana-team#2651 (private repo).
