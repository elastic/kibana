# @kbn/core-chrome-browser-components

UI components for the Kibana Chrome shell. Extracted from `@kbn/core-chrome-browser-internal` to separate rendering from state management.

## Structure

```
src/
  chrome_components.tsx   createChromeComponents() factory — wires observables to components
  classic/                Two-row classic header and its exclusive sub-components
  project/                Project-layout header, breadcrumbs, app menu, sidenav
  shared/                 Components used by both classic and project (nav controls, help menu, etc.)
  sidebar/                Chrome-level sidebar wrapper
```

## Public API

| Export | Description |
|---|---|
| `createChromeComponents` | Factory that returns component getters (`getClassicHeader`, `getProjectHeader`, etc.) |
| `ChromeComponentsDeps` | Props interface for `createChromeComponents` |
| `Header` / `HeaderProps` | Classic header component |
| `ProjectHeader` | Project header component |
| `LoadingIndicator` | Horizontal/bar loading indicator |
| `Sidebar` | Sidebar wrapper |
| `HeaderBreadcrumbsBadges` | Breadcrumb badge renderer, used by `browser-internal` state |

