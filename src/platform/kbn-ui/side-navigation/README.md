# Solution-focused side navigation

| Information | Details |
| --- | --- |
| **Date** | 2026-05-19 |
| **Author** | [@katesosedova](https://github.com/katesosedova) |
| **Relevant links** | [Workspace chrome guidelines](https://docs.elastic.dev) · [EUI](https://eui.elastic.co) · Storybook: `yarn storybook shared_ux` |

---

## Product

### Overview

Solution-focused side navigation is Kibana's default way to help users find their way around. It has two parts: a **primary menu** on the left (top-level sections with icons and labels) and an optional **secondary panel** (the child pages and sub-sections of wherever you currently are). Together they keep users oriented as they move through a solution.

Kibana also has a legacy "classic" navigation style — new work should use the solution-focused pattern instead. See [modes](./wiki/product/modes.md).

### What it solves

- Keeps the top-level list short, so Kibana doesn't feel overwhelming at first glance.
- Surfaces only the destinations relevant to the current solution (Observability, Security, Elasticsearch, and so on) instead of one giant flat list.
- Lets users collapse the nav when they need more screen space — handy for flyouts, the AI Assistant, or just focusing on content.
- Gives all solutions a consistent shell, so users feel familiar as they move between them.

### When to use

Use this when you're building or updating a Kibana solution shell (Observability, Security, Elasticsearch, and similar) and you have a meaningful set of top-level destinations, each with their own child pages.

### When not to use

- **Within a single feature area** — use tabs, breadcrumbs, or page-level links instead.
- **Very flat IA** (two or three sibling pages) — a landing page with links or just tabs is simpler.
- **Product announcements or marketing** — put those in What's New, in-page messages, or contextual cues. The secondary menu is not a bulletin board. See [secondary menu](./wiki/product/secondary-menu.md).
- **Classic Kibana chrome** — avoid mixing both styles on the same deployment without a migration plan.

### Anatomy

| Part | Role |
| --- | --- |
| [Solution logo / home](./wiki/product/primary-menu.md#solution-logo) | Returns to the solution home; not counted toward the overflow limit. |
| [Primary menu (top)](./wiki/product/primary-menu.md) | Top-level destinations — icons and labels when expanded, icons only when collapsed. |
| [Primary menu (bottom / footer)](./wiki/product/footer.md) | Utility items like Settings; labels stay hidden even in expanded mode. |
| [Secondary menu / side panel](./wiki/product/secondary-menu.md) | Child pages and sections for the selected primary item. Stays open in expanded mode, appears on hover in collapsed. |
| [Popover](./wiki/product/primary-menu.md#popover-behavior) | Shows secondary content on hover when collapsed, or when no parent item is selected yet. |
| [More menu](./wiki/product/more-menu.md) | Catches primary items that don't fit — either because the list exceeds 12 items, or the window is too short to show them all. |
| [Collapse control](./wiki/product/modes.md#collapse-and-expand) | Toggles between expanded and collapsed mode. |

### Behavior

| Expanded (default) | Collapsed |
| --- | --- |
| ![Expanded mode](./wiki/assets/expanded_mode.png) | ![Collapsed mode](./wiki/assets/collapsed_mode.png) |

**Expanded vs collapsed**

In expanded mode the primary menu shows icons and labels, and the secondary panel stays open as you navigate. In collapsed mode only icons are visible; the secondary content appears as a popover on hover — except for the currently selected item, which keeps its panel pinned. The nav automatically switches to collapsed at small viewport sizes (xs/s breakpoints). See [modes](./wiki/product/modes.md).

**Active state**

Exactly one primary item is active at a time, always reflecting the user's current location. The secondary menu highlights the current page when it's visible. See [active state](./wiki/product/active-state.md).

**Overflow (More menu)**

When the primary list has more than 12 items, or when the window is too short to show them all, extra items are tucked into a "More" entry at the bottom. This adjusts live as the nav container is resized — no manual threshold needed. See [more menu](./wiki/product/more-menu.md).

**Content guidelines**

- Up to 12 items at the top of the primary menu, up to 5 at the bottom (3 or fewer is recommended).
- Labels should be sentence case, ideally one word, and no longer than 10–11 characters.
- "Discover" and "Dashboards" are always the first two items after the logo, across all solutions.
- Secondary menu item names must match their page headers exactly.

Further detail: [content and labels](./wiki/product/content-and-labels.md) · [badges](./wiki/product/badges.md) · [listing pages](./wiki/product/listing-pages.md) (planned).

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
