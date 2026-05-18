# Kibana integration

## Overview

Kibana uses this package as the **rendering layer**; **core chrome** supplies the navigation tree and collapse persistence.

## Wiring

| Layer | Path |
| ----- | ---- |
| Component | `@kbn/ui-side-navigation` → `Navigation` |
| Adapter | `src/core/packages/chrome/browser-components/src/project/sidenav/navigation/navigation.tsx` |
| Tree mapping | `to_navigation_items.tsx` (`ChromeProjectNavigationNode` → `NavigationStructure`) |
| Data | `chrome.project.getNavigation$()` |
| Layout width | Chrome grid + `global_header_shell` (`COLLAPSED_WIDTH` / `EXPANDED_WIDTH`) |

## Problem it solves

Plugins register project navigation via chrome APIs instead of mounting `Navigation` directly.

## When to use / not use

| Do in plugins | Don't |
| ------------- | ----- |
| Extend navigation tree / active nodes | Import `Navigation` in feature plugins for production chrome |
| Use `BadgeType` from package types in chrome contracts | Fork badge or overflow behavior locally |

## Mapping notes (`to_navigation_items`)

- Root → logo; 2nd level → primary; 3rd level → secondary sections.
- Accordions flattened; unsupported dividers flattened.
- `panelOpener` nodes → `sections` + side panel behavior.

## Do / Don't

| Do | Don't |
| -- | ----- |
| Keep `activeItemId` in sync with routing. | Hand-build `NavigationStructure` in chrome without the adapter. |

Kibana dev docs entry: [README.mdx](../../README.mdx) (stub; links here).
