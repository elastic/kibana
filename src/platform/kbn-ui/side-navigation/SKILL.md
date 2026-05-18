---
name: kui-side-navigation
description: Solution-focused left-side navigation for Kibana chrome and KUI consumers. Use when defining, implementing, or reviewing primary/secondary nav structure, collapse behavior, badges, or overflow "More" menu.
---

# Left-side navigation

Package `@kbn/ui-side-navigation` · Component `Navigation` · UX source: *Solution-focused left-side navigation* (approved Jul 2025).

## Overview

Adaptive left chrome navigation: **logo**, **primary** rail (top + **More** overflow), **footer** utilities, and optional **secondary** panel or popovers for child links. Built on [EUI](https://eui.elastic.co/) (`IconType`, breakpoints, tooltips, popovers). Accessibility-first (roving focus, `aria-current`, screen-reader hints). Part of solution chrome layout (grid sidebar slot).

![Expanded mode](./references/assets/expanded_mode.png) ![Collapsed mode](./references/assets/collapsed_mode.png)

## Problem it solves

- Consistent cross-solution navigation **interactions** while IA varies per product.
- Fewer visible top-level items with fast access to **sibling pages** via secondary nav.
- **Collapsed** mode frees width for content, flyouts, and assistants.
- Enforced **capacity** (overflow, footer cap) keeps the rail scannable.

## When to use

- Solution / project chrome with chapter-level apps and child pages.
- Tree expressible as `primaryItems` + optional `sections` + `footerItems`.
- Parent layout consumes `setWidth` when the secondary panel opens.

## When not to use

- Classic Kibana nav (different chrome).
- In-page-only wayfinding (tabs, breadcrumbs)—see [primary](./references/primary-menu.md#content-guidelines) / [secondary](./references/secondary-menu.md#content-guidelines) content rules.
- Announcements or non-nav content in the secondary panel.
- Very shallow IA (2–3 links)—see [secondary menu](./references/secondary-menu.md#content-guidelines).
- Features marked **future/WIP** in UX only (resizable secondary, listing-page auto-hide, in-panel search)—not in this component yet.

## Anatomy

| Part | Role | Detail |
| ---- | ---- | ------ |
| Primary menu | Logo, top items, More overflow | [references/primary-menu.md](./references/primary-menu.md) |
| Secondary menu | Child links & sections | [references/secondary-menu.md](./references/secondary-menu.md) |
| Footer menu | Utilities (e.g. Settings) | [references/footer.md](./references/footer.md) |
| Badges | New / beta / tech preview | [references/badges.md](./references/badges.md) |
| Collapse control | Expanded ↔ collapsed | [references/modes.md](./references/modes.md) |

## Behavior

- **Expanded:** Labels on primary items; secondary **persists** beside the rail when the active primary has `sections`.
- **Collapsed:** Icon-only rail; secondary in **popovers** (footer popovers bottom-aligned).
- **Active state:** Exactly one `aria-current="page"`; parent highlighted when a child route is active.
- **More:** Click-pinned nested popover when primary overflows—[primary-menu](./references/primary-menu.md#more-overflow).
- **Responsive:** `xs`/`s` forces collapsed; collapse toggle hidden.
- **New badges:** Visit tracking + caps in `useNewItems`—[badges](./references/badges.md).

Full interaction matrix (expanded vs collapsed): [references/modes.md](./references/modes.md).

## Code

| Topic | Reference |
| ----- | --------- |
| Props, types, exports, a11y | [references/code/api.md](./references/code/api.md) |
| Full examples | [references/code/examples.md](./references/code/examples.md) |
| Kibana chrome wiring | [references/code/kibana-integration.md](./references/code/kibana-integration.md) |

```tsx
import { Navigation } from '@kbn/ui-side-navigation';

<Navigation
  logo={{ id: 'home', label: 'Observability', iconType: 'observabilityApp', href: '/app' }}
  items={{ primaryItems: [...], footerItems: [...] }}
  activeItemId={routeId}
  isCollapsed={collapsed}
  setWidth={setNavWidth}
  onToggleCollapsed={setCollapsed}
  onItemClick={(item) => { /* navigate */ }}
/>
```

**Dependencies:** `@elastic/eui`, `@kbn/i18n`, `@kbn/i18n-react`, `@emotion/react`.

## Do / Don't

| Do | Don't |
| -- | ----- |
| One active context; stable `activeItemId`. | Duplicate destinations in tabs **and** secondary nav. |
| Match secondary labels to page titles; sentence case. | Use secondary for product announcements. |
| Settings-class links in **footer**; clear footer icons. | Exceed 12 top primaries or 5 footer items without design review. |
| `badgeType: 'new'` only for new **pages**. | Mark menu moves as "new". |
| `isExternal: true` for off-app links. | Import deep paths when package root exports suffice. |
