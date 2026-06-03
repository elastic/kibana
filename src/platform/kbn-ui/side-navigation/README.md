# Solution-focused side navigation

| Information | Details |
| --- | --- |
| **Date** | 2026-05-19 |
| **Author** | [@katesosedova](https://github.com/katesosedova) |
| **Relevant links** | [Workspace chrome guidelines](https://docs.elastic.dev) · [EUI](https://eui.elastic.co) · Storybook: `yarn storybook shared_ux` |

---

## Product

### Overview

Solution-focused left-side navigation is Kibana's default chrome navigation pattern. It pairs a **primary menu** (icons and labels) with an optional **secondary menu** (child destinations and related content). Users switch between **expanded** and **collapsed** modes to balance wayfinding and workspace width.

Kibana also supports a legacy classic navigation; new work should use this pattern. See [modes](./wiki/product/modes.md).

### Problem it solves

- Reduces perceived complexity by displaying fewer top-level navigation items.
- Keeps context-specific destinations reachable without leaving the current solution area.
- Provides a consistent shell across Elasticsearch, Observability, and Security so users can move between solutions with familiar placement and behavior.
- Supports collapsed mode to increase available width for flyouts, AI Assistant, and content navigation.

### When to use

- Building or updating a Kibana **solution** application shell (Observability, Security, Elasticsearch, and similar).
- Organizing IA where a small set of top-level contexts each owns many child pages.
- When users benefit from a persistent secondary panel (expanded mode) or hover popovers (collapsed mode).

### When not to use

- **In-page navigation only** — use tabs, breadcrumbs, or page-level links when the scope is a single feature area.
- **Marketing or announcements** — place these as in-page messages, What's New, or contextual cues; not in the secondary menu. See [secondary menu](./wiki/product/secondary-menu.md).
- **Very shallow IA** (two or three sibling pages) — consider tabs or a landing page with links instead of a sparse secondary panel.
- **Classic Kibana chrome** — avoid mixing patterns on the same deployment without an explicit migration plan.

### Anatomy

| Expanded mode | Collapsed mode |
| --- | --- |
| ![Expanded mode](./wiki/assets/expanded_mode.png) | ![Collapsed mode](./wiki/assets/collapsed_mode.png) |

| Part | Role |
| --- | --- |
| [Solution logo / home](./wiki/product/primary-menu.md#solution-logo) | Returns to the solution home; excluded from the "More" item count. |
| [Primary menu (top)](./wiki/product/primary-menu.md) | Top-level contexts; icons + labels in expanded mode. |
| [Primary menu (bottom / footer)](./wiki/product/footer.md) | Utilities (for example Settings); labels hidden in expanded mode. |
| [Secondary menu / side panel](./wiki/product/secondary-menu.md) | Child items and optional sections; persistent in expanded mode. |
| [Popover](./wiki/product/primary-menu.md#popover-behavior) | Secondary content on hover when collapsed, or before a parent is selected. |
| [More menu](./wiki/product/more-menu.md) | Overflow for items that do not fit vertically or exceed the item cap. |
| [Collapse control](./wiki/product/modes.md#collapse-and-expand) | Toggles expanded vs collapsed primary chrome. |

### Behavior

- **Expanded (default):** Primary labels visible; secondary panel stays open while navigating its items. See [modes](./wiki/product/modes.md).
- **Collapsed:** Primary shows icons only; secondary appears on hover (except selected-item rules). See [primary menu interactions](./wiki/product/primary-menu.md#interaction-matrix).
- **Active state:** Exactly one primary item reflects the current location; secondary highlights the current page when shown. See [active state](./wiki/product/active-state.md).
- **Responsive:** Navigation forces collapsed on small breakpoints; overflow folds into **More** when height is insufficient. Engineering details: [architecture](./wiki/engineering/architecture.md).

Further product detail: [content and labels](./wiki/product/content-and-labels.md) · [badges](./wiki/product/badges.md) · [listing pages](./wiki/product/listing-pages.md) (planned).

---

## Engineering

### Architecture

`@kbn/ui-side-navigation` exports a single `Navigation` component composed of `SideNav` subcomponents (logo, primary menu, popover, secondary menu, nested "More" menu, footer, side panel). State for active routes, collapse, overflow, and "new" badges is coordinated in hooks. See [architecture](./wiki/engineering/architecture.md).

### Api-reference

Configure navigation via `items` (`NavigationStructure`), `logo`, `activeItemId`, `isCollapsed`, and `setWidth`. Types and props: [api-reference](./wiki/engineering/api-reference.md).

### Accessibility

Roving tabindex on primary items, `aria-setsize` / `aria-posinset`, labelled regions, and focus return from nested "More" panels. See [accessibility](./wiki/engineering/accessibility.md).

### Testing and troubleshooting

Jest + React Testing Library; Storybook under `shared_ux`. See [testing and troubleshooting](./wiki/engineering/testing-and-troubleshooting.md).

### Migration

N/A for initial `@kbn/ui-side-navigation` package. Teams migrating from classic chrome should follow Kibana platform chrome integration: [Kibana integration](./wiki/engineering/kibana-integration.md).
