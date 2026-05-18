# Left-side navigation

Package `@kbn/ui-side-navigation` · Component `Navigation` · UX source: *Solution-focused left-side navigation* (approved Jul 2025).

## Overview

Adaptive left chrome navigation: **logo**, **primary** rail (top + **More** overflow), **footer** utilities, and optional **secondary** panel or popovers for child links. Built on [EUI](https://eui.elastic.co/) (`IconType`, breakpoints, tooltips, popovers). Accessibility-first (roving focus, `aria-current`, screen-reader hints). Part of solution chrome layout (grid sidebar slot).

![Expanded mode](./wiki/assets/expanded_mode.png) ![Collapsed mode](./wiki/assets/collapsed_mode.png)

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
- In-page-only wayfinding (tabs, breadcrumbs)—see [primary](./wiki/primary-menu.md#content-guidelines) / [secondary](./wiki/secondary-menu.md#content-guidelines) content rules.
- Announcements or non-nav content in the secondary panel.
- Very shallow IA (2–3 links)—see [secondary menu](./wiki/secondary-menu.md#content-guidelines).
- Features marked **future/WIP** in UX only (resizable secondary, listing-page auto-hide, in-panel search)—not in this component yet.

## Anatomy

| Part | Role | Detail |
| ---- | ---- | ------ |
| Primary menu | Logo, top items, More overflow | [wiki/primary-menu.md](./wiki/primary-menu.md) |
| Secondary menu | Child links & sections | [wiki/secondary-menu.md](./wiki/secondary-menu.md) |
| Footer menu | Utilities (e.g. Settings) | [wiki/footer.md](./wiki/footer.md) |
| Badges | New / beta / tech preview | [wiki/badges.md](./wiki/badges.md) |
| Collapse control | Expanded ↔ collapsed | [wiki/modes.md](./wiki/modes.md) |

## Behavior

- **Expanded:** Labels on primary items; secondary **persists** beside the rail when the active primary has `sections`.
- **Collapsed:** Icon-only rail; secondary in **popovers** (footer popovers bottom-aligned).
- **Active state:** Exactly one `aria-current="page"`; parent highlighted when a child route is active.
- **More:** Click-pinned nested popover when primary overflows—[primary-menu](./wiki/primary-menu.md#more-overflow).
- **Responsive:** `xs`/`s` forces collapsed; collapse toggle hidden.
- **New badges:** Visit tracking + caps in `useNewItems`—[badges](./wiki/badges.md).

Full interaction matrix (expanded vs collapsed): [wiki/modes.md](./wiki/modes.md).

## Code

| Topic | Reference |
| ----- | --------- |
| Props, types, exports, a11y | [wiki/code/api.md](./wiki/code/api.md) |
| Full examples | [wiki/code/examples.md](./wiki/code/examples.md) |
| Kibana chrome wiring | [wiki/code/kibana-integration.md](./wiki/code/kibana-integration.md) |

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
