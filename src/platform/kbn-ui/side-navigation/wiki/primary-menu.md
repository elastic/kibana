# Primary menu

Top rail: **logo**, scrollable **items**, and system **More** overflow. Footer is separate—[footer.md](./footer.md).

## Overview

First-level solution navigation: branding home link, icon + label chapters (expanded), optional `sections` for secondary UI, and automatic overflow when capacity is exceeded.

## Problem it solves

- Anchors users to the solution root (logo).
- Limits visible top-level choices while exposing frequent chapters.
- Keeps the rail within **12** slots via **More** when IA or viewport requires it.

## When to use / not use

| Use | Don't |
| --- | ----- |
| App/chapter entries (Discover, Dashboards, …) | Page-level tabs or one-off CTAs |
| Solution `iconType` + product name on logo | Logo slot for non-home actions |
| IA that may fold overflow items | A manual "More" item in data (system-generated) |
| | Section dividers in top rail (UX future/WIP) |

## Anatomy

```
┌─────────────────┐
│ Logo (home)     │  SideNavLogo — required
├─────────────────┤
│ Primary items   │  MenuItem[]
│ …               │
│ More (overflow) │  if needed — not in data
└─────────────────┘
```

| Part | Data | Notes |
| ---- | ---- | ----- |
| **Logo** | `logo` prop: `id`, `href`, `label`, `iconType`, optional `data-test-subj` | Counts as home; **excluded** from More overflow count (UX) |
| **Items** | `items.primaryItems[]`: `id`, `label`, `href`, `iconType`, optional `sections`, `badgeType` | Scrollable list between logo and footer |
| **More** | — | `boxesVertical` trigger; `NestedSecondaryMenu` (`MORE_MENU_ID`, `MAIN_PANEL_ID`) |

## Behavior

### Logo

Active/highlight via `useNavigation`; clicks through `onItemClick`. Keep `id` stable for routing.

### Primary items

| Type | Expanded | Collapsed |
| ---- | -------- | --------- |
| No children | Click → page; no hover UI | Tooltip with label |
| Has children | Click → `href` + side panel; hover popover until selected | Popover on hover; click navigates |

After selecting a childful item in expanded mode, hover popover stops for that item; collapsed keeps hover access.

**Capacity:** **12** top slots (UX, incl. logo/home). Labels ~≤11 chars ideal; truncate beyond width. Cross-solution: after logo, **Discover** then **Dashboards** (documented exceptions apply).

### More (overflow)

Appears via `useResponsiveMenu` when items exceed vertical fit or `MAX_MENU_ITEMS` (12)—not configured in data.

- UX: at 13 top items → **11** visible + **2** under More (logo not counted).
- **Click-pinned** until outside click (unlike hover-only popovers).
- Childful overflow items: chevron → nested panel in same popover.

## Content guidelines

*Solution-focused left-side navigation* (Jul 2025). IA varies per solution; **interaction and position** stay consistent (e.g. Settings always in footer when present).

| Rule | Detail |
| ---- | ------ |
| **Capacity** | **12** top slots incl. logo → overflow to More; at 13 items show 11 + 2 under More |
| **Order** | After logo: **Discover**, then **Dashboards** (exceptions: Workchat, Cloud, …) |
| **Grouping** | Merge related chapters under one primary; fan out in [secondary](./secondary-menu.md) |
| **Labels** | Sentence case; one word ideal (~≤11 chars); no CamelCase; glossary exceptions only |
| **Icons** | EUI `iconType`; labels disambiguate abstract domains |
| **External links** | `isExternal: true` on `MenuItem` (new tab + icon) |
| **IA validation** | Card sort / tree testing for large changes |

**Future (UX, not in component):** section dividers in top primary.

## Do / Don't

| Do | Don't |
| -- | ----- |
| Prioritize globally relevant primary items. | Crowd the rail—merge into secondary instead. |
| Design IA assuming overflow may land under More. | Use logo for non-home actions. |
| Keep logo `id` stable. | Add a manual More menu item. |

Modes: [modes.md](./modes.md) · API: [code/api.md](./code/api.md) · Footer limits: [footer.md](./footer.md).
