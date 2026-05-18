# Secondary menu

## Overview

Child navigation via `sections[]` → `items[]`. Side **panel** when expanded; **popover** when collapsed.

## Problem it solves

Quick switching among sibling pages under one primary chapter.

## When to use / not use

| Use | Don't |
| --- | ----- |
| Enough siblings to justify a panel (~4+) | 2–3 links only—use parent tabs or in-page links |
| Labels match page headers | Announcements, unrelated widgets |
| Optional `sidePanelFooter` for nav-adjacent actions | Same routes as page tabs |

## Anatomy

- Panel header: parent `label`, badges
- Sections: optional `label` + `SecondaryMenuItem` list
- `sidePanelFooter` on `Navigation` (expanded only)

## Behavior

- **Expanded:** Panel stays open while navigating children (`SIDE_PANEL_WIDTH` 248px in layout math; UX target 240px, resizable 200–360px not implemented here).
- **Collapsed:** Popover on primary/footer trigger; footer triggers align to bottom.
- **External:** `isExternal: true` → new tab + EUI external icon.
- **Listing pages (UX):** Landing may hide secondary until drill-in—not automated; shape tree + `activeItemId` in chrome.

## Content guidelines

*Solution-focused left-side navigation* (Jul 2025).

| Rule | Detail |
| ---- | ------ |
| **Capacity** | Minimum items that **justify** a panel; avoid 2–3 link panels—use in-page tabs or links |
| **Labels** | **Match page headers** exactly; sentence case; no CTAs in page headers |
| **Sections** | Optional headers for long lists (~10+). Ask: does the title add meaning; is order intentional? |
| **Purpose** | Navigation only—not product announcements (“What’s New”, in-page messaging instead) |
| **Tabs** | Never duplicate the same routes as page tabs |
| **External links** | `isExternal: true` on `SecondaryMenuItem` (new tab + EUI external icon) |
| **Panel width (UX)** | Default 240px, range 200–360px resizable (TBD); code uses fixed 248px layout width |

**Future (UX, not in component):** listing-page hide/show secondary, in-panel search (&gt;20 items), favorites/recents blocks, user-resizable panel.

## Do / Don't

| Do | Don't |
| -- | ----- |
| Add section titles when they clarify long groups. | Sparse panels, announcements, or duplicate tab bars. |
| Keep names aligned with destination pages. | Use secondary for “new” features that live only in-page. |

Badges: [badges.md](./badges.md) · Primary / overflow: [primary-menu.md](./primary-menu.md).
